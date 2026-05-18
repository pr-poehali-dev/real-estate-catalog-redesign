"""
Удаляет водяные знаки и логотипы с фотографий объектов недвижимости.
Алгоритм: скачивает фото по CDN-URL, детектирует полупрозрачные/яркие наложенные области
по краям (типичные места логотипов: углы, верх/низ), применяет inpainting через
cv2.inpaint (метод Navier-Stokes) или Pillow-fallback, сохраняет результат в S3.
Args: POST {url: str, sensitivity?: float (0.1-1.0, default 0.35)}
Returns: {url: str} — новый CDN URL обработанного фото
"""

import base64
import io
import json
import os
import uuid

import boto3
import psycopg2
import requests
from PIL import Image, ImageFilter, ImageChops
from psycopg2.extras import RealDictCursor

SCHEMA = 't_p71821556_real_estate_catalog_'

HEADERS_RESP = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}


def _ok(body, status=200):
    return {'statusCode': status, 'headers': HEADERS_RESP, 'body': json.dumps(body, ensure_ascii=False)}


def _err(code, msg):
    return _ok({'error': msg}, code)


def _safe(s, length=100):
    return (s or '').replace("'", "''")[:length]


def _check_auth(token):
    if not token:
        return None
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            t = _safe(token, 100)
            cur.execute(
                f"SELECT u.id, u.role FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id = s.user_id "
                f"WHERE s.token = '{t}' AND s.expires_at > NOW() AND u.is_active = TRUE"
            )
            return cur.fetchone()
    finally:
        conn.close()


def _build_mask(img: Image.Image, sensitivity: float) -> Image.Image:
    """
    Строит маску областей, которые похожи на водяные знаки/логотипы:
    - Полупрозрачные области (если PNG с альфа-каналом)
    - Области с очень высокой яркостью (белые/светлые наложения)
    - Области с очень насыщенным цветом поверх
    Маска: белое = удалить (inpaint), чёрное = оставить.
    """
    w, h = img.size
    threshold = int(255 * (1.0 - sensitivity))  # при sensitivity=0.35 → threshold=165

    # Конвертируем в RGBA чтобы работать с альфа-каналом
    rgba = img.convert('RGBA')
    r, g, b, a = rgba.split()

    mask = Image.new('L', (w, h), 0)

    # 1. Полупрозрачные пиксели (логотипы обычно накладываются с opacity < 80%)
    import numpy as np
    a_arr = np.array(a)
    # Области где альфа < 200 (т.е. полупрозрачные) — но только если исходник PNG с альфой
    if img.mode == 'RGBA':
        semi_transparent = (a_arr > 10) & (a_arr < 200)
        mask_arr = np.array(mask)
        mask_arr[semi_transparent] = 255
        mask = Image.fromarray(mask_arr.astype(np.uint8))

    # 2. Детектируем логотипы в углах изображения (20% от каждого края)
    rgb = img.convert('RGB')
    rgb_arr = np.array(rgb).astype(np.float32)

    # Яркость (luminance)
    lum = 0.299 * rgb_arr[:, :, 0] + 0.587 * rgb_arr[:, :, 1] + 0.114 * rgb_arr[:, :, 2]

    corner_h = max(60, int(h * 0.20))
    corner_w = max(120, int(w * 0.25))

    # Маска угловых зон
    corner_mask = np.zeros((h, w), dtype=bool)
    corner_mask[:corner_h, :corner_w] = True          # верх-лево
    corner_mask[:corner_h, -corner_w:] = True         # верх-право
    corner_mask[-corner_h:, :corner_w] = True         # низ-лево
    corner_mask[-corner_h:, -corner_w:] = True        # низ-право

    # В угловых зонах ищем однородные светлые/тёмные кластеры
    mask_arr = np.array(mask)
    for zone_slice in [
        (slice(0, corner_h), slice(0, corner_w)),
        (slice(0, corner_h), slice(w - corner_w, w)),
        (slice(h - corner_h, h), slice(0, corner_w)),
        (slice(h - corner_h, h), slice(w - corner_w, w)),
    ]:
        zone_lum = lum[zone_slice]
        zone_rgb = rgb_arr[zone_slice]

        # Стандартное отклонение яркости в зоне
        zone_std = float(np.std(zone_lum))
        zone_mean = float(np.mean(zone_lum))

        # Если зона однородно светлая (логотип на белом фоне) или тёмная — это подозрительно
        # Дополнительно: ищем пиксели, которые сильно отличаются от среднего фона
        bg_lum_mean = float(np.mean(lum))  # средняя яркость всего фото

        # Пиксели в зоне, которые на threshold единиц ярче/темнее среднего фона
        diff = np.abs(zone_lum - bg_lum_mean)
        suspicious = diff > (255 * sensitivity * 0.6)

        # Если подозрительных пикселей достаточно много в зоне — помечаем всю область
        suspicious_ratio = float(np.mean(suspicious))
        if suspicious_ratio > 0.15:
            # Уточняем: помечаем только сами подозрительные пиксели, а не всю зону
            mask_arr[zone_slice][suspicious] = 255

    # Небольшое расширение маски (dilation) через Pillow
    mask = Image.fromarray(mask_arr.astype(np.uint8))
    mask = mask.filter(ImageFilter.MaxFilter(7))  # dilate 3px
    mask = mask.filter(ImageFilter.GaussianBlur(2))

    return mask


def _inpaint_pillow(img: Image.Image, mask: Image.Image) -> Image.Image:
    """
    Простой inpainting через Pillow: заполняем помеченные области
    размытым контентом соседних пикселей (несколько итераций).
    """
    import numpy as np

    result = img.convert('RGB')
    mask_arr = np.array(mask.convert('L'))
    result_arr = np.array(result).astype(np.float32)

    wm_pixels = mask_arr > 128

    if not np.any(wm_pixels):
        return result

    # Итеративное заполнение: берём среднее соседей без маски
    for _ in range(8):
        blurred = np.array(
            Image.fromarray(result_arr.astype(np.uint8)).filter(ImageFilter.GaussianBlur(9))
        ).astype(np.float32)
        result_arr[wm_pixels] = blurred[wm_pixels]

    return Image.fromarray(result_arr.astype(np.uint8))


def _try_opencv_inpaint(img_pil: Image.Image, mask_pil: Image.Image) -> Image.Image:
    """Пробуем cv2.inpaint (лучшее качество). При ошибке — fallback на Pillow."""
    try:
        import cv2
        import numpy as np
        img_arr = np.array(img_pil.convert('RGB'))
        img_bgr = cv2.cvtColor(img_arr, cv2.COLOR_RGB2BGR)
        mask_arr = np.array(mask_pil.convert('L'))
        mask_bin = (mask_arr > 128).astype(np.uint8) * 255
        # Navier-Stokes inpainting, радиус 5px
        result_bgr = cv2.inpaint(img_bgr, mask_bin, inpaintRadius=5, flags=cv2.INPAINT_NS)
        result_rgb = cv2.cvtColor(result_bgr, cv2.COLOR_BGR2RGB)
        return Image.fromarray(result_rgb)
    except ImportError:
        return _inpaint_pillow(img_pil, mask_pil)


def handler(event: dict, context) -> dict:
    """Удаляет водяные знаки и логотипы с фотографии по CDN-ссылке."""

    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
                'Access-Control-Max-Age': '86400',
            },
            'body': '',
        }

    if event.get('httpMethod') != 'POST':
        return _err(405, 'Method not allowed')

    headers = event.get('headers') or {}
    token = headers.get('X-Auth-Token') or headers.get('x-auth-token') or ''
    user = _check_auth(token)
    if not user:
        return _err(401, 'Требуется авторизация')
    if user['role'] not in ('admin', 'editor', 'manager'):
        return _err(403, 'Только для сотрудников')

    body = json.loads(event.get('body') or '{}')
    photo_url = (body.get('url') or '').strip()
    sensitivity = float(body.get('sensitivity') or 0.35)
    sensitivity = max(0.1, min(1.0, sensitivity))

    if not photo_url:
        return _err(400, 'Не передан url фотографии')

    # Скачиваем фото
    try:
        resp = requests.get(photo_url, timeout=20, headers={'User-Agent': 'Mozilla/5.0'})
        resp.raise_for_status()
        img_data = resp.content
    except Exception as e:
        return _err(400, f'Не удалось скачать фото: {e}')

    # Открываем через Pillow
    try:
        img = Image.open(io.BytesIO(img_data))
        img.load()
    except Exception as e:
        return _err(400, f'Не удалось открыть изображение: {e}')

    # Строим маску водяных знаков
    mask = _build_mask(img, sensitivity)

    import numpy as np
    mask_arr = np.array(mask.convert('L'))
    has_watermark = bool(np.mean(mask_arr > 128) > 0.005)  # хотя бы 0.5% пикселей

    if not has_watermark:
        # Водяных знаков не обнаружено — возвращаем исходник как есть
        result_img = img.convert('RGB')
    else:
        result_img = _try_opencv_inpaint(img, mask)

    # Сохраняем результат в WebP
    out_buf = io.BytesIO()
    result_img.save(out_buf, format='WEBP', quality=92, method=6)
    out_buf.seek(0)
    out_bytes = out_buf.read()

    # Загружаем в S3
    key = f"photos/{uuid.uuid4().hex}_nowm.webp"
    aws_key = os.environ['AWS_ACCESS_KEY_ID']
    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=aws_key,
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )
    s3.put_object(Bucket='files', Key=key, Body=out_bytes, ContentType='image/webp')

    new_url = f"https://cdn.poehali.dev/projects/{aws_key}/bucket/{key}"
    return _ok({'url': new_url, 'detected': has_watermark})
