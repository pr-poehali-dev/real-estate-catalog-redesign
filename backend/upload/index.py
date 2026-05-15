"""
Business: Загрузка фото/логотипа/водяного знака в S3 через base64. Опционально накладывает водяной знак на фото объектов.
Args: event с httpMethod POST, body {file_base64, filename, kind (photo/logo/watermark), apply_watermark}, headers X-Auth-Token
Returns: HTTP-ответ с url загруженного файла на CDN
"""

import base64
import json
import os
import secrets
import io

import boto3
import psycopg2
from psycopg2.extras import RealDictCursor

SCHEMA = 't_p71821556_real_estate_catalog_'


def _ok(body, status=200):
    return {
        'statusCode': status,
        'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
        'body': json.dumps(body, ensure_ascii=False),
    }


def _err(code, msg):
    return _ok({'error': msg}, code)


def _safe(s, length=100):
    return (s or '').replace("'", "''")[:length]


def _get_user(cur, token):
    if not token:
        return None
    t = _safe(token, 100)
    cur.execute(
        f"SELECT u.id, u.role FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id = s.user_id "
        f"WHERE s.token = '{t}' AND s.expires_at > NOW() AND u.is_active = TRUE"
    )
    return cur.fetchone()


def _apply_watermark(image_bytes, settings):
    try:
        from PIL import Image
    except Exception:
        return image_bytes

    if not settings or not settings.get('watermark_enabled') or not settings.get('watermark_url'):
        return image_bytes

    try:
        import urllib.request
        wm_resp = urllib.request.urlopen(settings['watermark_url'], timeout=10)
        wm_bytes = wm_resp.read()

        base_img = Image.open(io.BytesIO(image_bytes)).convert('RGBA')
        wm = Image.open(io.BytesIO(wm_bytes)).convert('RGBA')

        # Размер водяного знака — 20% от ширины фото
        ratio = (base_img.width * 0.2) / wm.width
        wm = wm.resize((int(wm.width * ratio), int(wm.height * ratio)), Image.LANCZOS)

        # Прозрачность
        opacity = int(settings.get('watermark_opacity', 50)) / 100
        alpha = wm.split()[3]
        alpha = alpha.point(lambda p: int(p * opacity))
        wm.putalpha(alpha)

        margin = 20
        pos = settings.get('watermark_position', 'bottom-right')
        if pos == 'bottom-right':
            xy = (base_img.width - wm.width - margin, base_img.height - wm.height - margin)
        elif pos == 'bottom-left':
            xy = (margin, base_img.height - wm.height - margin)
        elif pos == 'top-right':
            xy = (base_img.width - wm.width - margin, margin)
        elif pos == 'top-left':
            xy = (margin, margin)
        elif pos == 'center':
            xy = ((base_img.width - wm.width) // 2, (base_img.height - wm.height) // 2)
        else:
            xy = (base_img.width - wm.width - margin, base_img.height - wm.height - margin)

        base_img.paste(wm, xy, wm)
        out = io.BytesIO()
        base_img.convert('RGB').save(out, format='JPEG', quality=88)
        return out.getvalue()
    except Exception:
        return image_bytes


def handler(event, context):
    method = event.get('httpMethod', 'POST')

    if method == 'OPTIONS':
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

    if method != 'POST':
        return _err(405, 'Method not allowed')

    headers = event.get('headers') or {}
    token = headers.get('X-Auth-Token') or headers.get('x-auth-token') or ''

    dsn = os.environ['DATABASE_URL']
    conn = psycopg2.connect(dsn)
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            user = _get_user(cur, token)
            if not user:
                return _err(401, 'Требуется авторизация')
            if user['role'] not in ('admin', 'editor', 'manager'):
                return _err(403, 'Нет прав')

            body = json.loads(event.get('body') or '{}')
            file_b64 = body.get('file_base64', '')
            filename = body.get('filename', 'file.jpg')
            kind = body.get('kind', 'photo')
            apply_wm = body.get('apply_watermark', False)

            if not file_b64:
                return _err(400, 'Пустой файл')

            if ',' in file_b64:
                file_b64 = file_b64.split(',', 1)[1]

            try:
                data = base64.b64decode(file_b64)
            except Exception:
                return _err(400, 'Невалидный base64')

            if len(data) > 15 * 1024 * 1024:
                return _err(400, 'Файл больше 15 МБ')

            ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else 'jpg'
            if ext not in ('jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'):
                ext = 'jpg'

            content_type = {
                'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
                'webp': 'image/webp', 'gif': 'image/gif', 'svg': 'image/svg+xml',
            }[ext]

            if kind == 'photo' and apply_wm and ext in ('jpg', 'jpeg', 'png', 'webp'):
                cur.execute(
                    f"SELECT watermark_enabled, watermark_url, watermark_opacity, watermark_position "
                    f"FROM {SCHEMA}.settings ORDER BY id ASC LIMIT 1"
                )
                wm_row = cur.fetchone()
                if wm_row and wm_row.get('watermark_enabled'):
                    data = _apply_watermark(data, dict(wm_row))
                    ext = 'jpg'
                    content_type = 'image/jpeg'

            folder = {'photo': 'photos', 'logo': 'logos', 'watermark': 'watermarks'}.get(kind, 'files')
            key = f"{folder}/{secrets.token_urlsafe(12)}.{ext}"

            s3 = boto3.client(
                's3',
                endpoint_url='https://bucket.poehali.dev',
                aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
            )
            s3.put_object(Bucket='files', Key=key, Body=data, ContentType=content_type)

            url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
            return _ok({'url': url, 'size': len(data)})
    finally:
        conn.close()
