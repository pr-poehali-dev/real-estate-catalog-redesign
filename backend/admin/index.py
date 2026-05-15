"""
Business: Админ API — CRUD объявлений, управление лидами, пользователями, страницами и настройками сайта с проверкой ролей.
Args: event с httpMethod, queryStringParameters {resource, id, action}, body, headers X-Auth-Token; context
Returns: HTTP-ответ с данными ресурса или ошибкой прав
"""

import json
import os
from datetime import datetime

import psycopg2
from psycopg2.extras import RealDictCursor

SCHEMA = 't_p71821556_real_estate_catalog_'


def _ok(body, status=200):
    return {
        'statusCode': status,
        'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
        'body': json.dumps(body, ensure_ascii=False, default=str),
    }


def _err(code, msg):
    return _ok({'error': msg}, code)


def _safe(s, length=255):
    return (s or '').replace("'", "''")[:length]


def _str_or_null(v, length=255):
    if v is None or v == '':
        return 'NULL'
    return f"'{_safe(str(v), length)}'"


def _int_or_null(v):
    if v is None or v == '':
        return 'NULL'
    try:
        return str(int(v))
    except (TypeError, ValueError):
        return 'NULL'


def _bool(v):
    return 'TRUE' if v else 'FALSE'


def _get_user(cur, token):
    if not token:
        return None
    t = _safe(token, 100)
    cur.execute(
        f"SELECT u.id, u.email, u.name, u.role FROM {SCHEMA}.sessions s "
        f"JOIN {SCHEMA}.users u ON u.id = s.user_id "
        f"WHERE s.token = '{t}' AND s.expires_at > NOW() AND u.is_active = TRUE"
    )
    return cur.fetchone()


def _can(role, resource, op):
    if role == 'admin':
        return True
    if role == 'manager':
        return resource in ('listings', 'leads') and op in ('read', 'create', 'update')
    if role == 'editor':
        if resource == 'listings':
            return op in ('read', 'create', 'update')
        if resource in ('pages', 'settings'):
            return op in ('read', 'update')
        if resource == 'leads':
            return op == 'read'
        return False
    if role == 'client':
        return resource == 'leads' and op == 'create'
    return False


def handler(event, context):
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
                'Access-Control-Max-Age': '86400',
            },
            'body': '',
        }

    params = event.get('queryStringParameters') or {}
    resource = params.get('resource', '')
    rid = params.get('id')
    action = params.get('action')
    headers = event.get('headers') or {}
    token = headers.get('X-Auth-Token') or headers.get('x-auth-token') or ''

    dsn = os.environ['DATABASE_URL']
    conn = psycopg2.connect(dsn)
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            user = _get_user(cur, token)
            if not user:
                return _err(401, 'Требуется авторизация')

            op = {'GET': 'read', 'POST': 'create', 'PUT': 'update', 'DELETE': 'delete'}.get(method, 'read')
            if not _can(user['role'], resource, op):
                return _err(403, 'Недостаточно прав')

            if resource == 'listings':
                return _listings(cur, conn, method, rid, event, user)
            if resource == 'leads':
                return _leads(cur, conn, method, rid, action, event, user)
            if resource == 'users':
                return _users(cur, conn, method, rid, event, user)
            if resource == 'pages':
                return _pages(cur, conn, method, rid, event, user)
            if resource == 'settings':
                return _settings(cur, conn, method, event, user)
            if resource == 'stats':
                return _stats(cur)

            return _err(400, 'Неизвестный ресурс')
    finally:
        conn.close()


def _listings(cur, conn, method, rid, event, user):
    if method == 'GET':
        if rid:
            cur.execute(f"SELECT * FROM {SCHEMA}.listings WHERE id = {int(rid)}")
            row = cur.fetchone()
            if not row:
                return _err(404, 'Не найдено')
            return _ok({'listing': _ser(dict(row))})
        cur.execute(f"SELECT * FROM {SCHEMA}.listings ORDER BY created_at DESC")
        return _ok({'listings': [_ser(dict(r)) for r in cur.fetchall()]})

    body = json.loads(event.get('body') or '{}')

    if method == 'POST':
        sql = (
            f"INSERT INTO {SCHEMA}.listings "
            f"(title, description, category, deal, price, price_per_m2, area, payback, profit, floor, total_floors, address, district, lat, lng, image, tags, is_hot, is_new, status, author_id) VALUES ("
            f"{_str_or_null(body.get('title'), 255)}, {_str_or_null(body.get('description'), 5000)}, "
            f"{_str_or_null(body.get('category'), 50)}, {_str_or_null(body.get('deal'), 20)}, "
            f"{_int_or_null(body.get('price'))}, {_int_or_null(body.get('price_per_m2'))}, "
            f"{_int_or_null(body.get('area'))}, {_int_or_null(body.get('payback'))}, "
            f"{_int_or_null(body.get('profit'))}, {_int_or_null(body.get('floor'))}, "
            f"{_int_or_null(body.get('total_floors'))}, {_str_or_null(body.get('address'), 255)}, "
            f"{_str_or_null(body.get('district'), 100)}, {_int_or_null(body.get('lat'))}, "
            f"{_int_or_null(body.get('lng'))}, {_str_or_null(body.get('image'), 500)}, "
            f"{_str_or_null(body.get('tags'), 1000)}, {_bool(body.get('is_hot'))}, "
            f"{_bool(body.get('is_new'))}, {_str_or_null(body.get('status') or 'active', 20)}, "
            f"{user['id']}) RETURNING id"
        )
        cur.execute(sql)
        new_id = cur.fetchone()['id']
        conn.commit()
        return _ok({'id': new_id, 'success': True})

    if method == 'PUT' and rid:
        fields = []
        for f, length in [('title', 255), ('description', 5000), ('category', 50), ('deal', 20),
                          ('address', 255), ('district', 100), ('image', 500), ('tags', 1000), ('status', 20)]:
            if f in body:
                fields.append(f"{f} = {_str_or_null(body.get(f), length)}")
        for f in ('price', 'price_per_m2', 'area', 'payback', 'profit', 'floor', 'total_floors'):
            if f in body:
                fields.append(f"{f} = {_int_or_null(body.get(f))}")
        for f in ('lat', 'lng'):
            if f in body:
                v = body.get(f)
                fields.append(f"{f} = " + ('NULL' if v is None or v == '' else str(float(v))))
        for f in ('is_hot', 'is_new'):
            if f in body:
                fields.append(f"{f} = {_bool(body.get(f))}")
        if not fields:
            return _err(400, 'Нет полей для обновления')
        fields.append("updated_at = NOW()")
        cur.execute(f"UPDATE {SCHEMA}.listings SET {', '.join(fields)} WHERE id = {int(rid)}")
        conn.commit()
        return _ok({'success': True})

    if method == 'DELETE' and rid:
        cur.execute(f"UPDATE {SCHEMA}.listings SET status = 'archived' WHERE id = {int(rid)}")
        conn.commit()
        return _ok({'success': True})

    return _err(400, 'Bad request')


def _leads(cur, conn, method, rid, action, event, user):
    if method == 'GET':
        if rid:
            cur.execute(f"SELECT * FROM {SCHEMA}.leads WHERE id = {int(rid)}")
            lead = cur.fetchone()
            if not lead:
                return _err(404, 'Не найдено')
            cur.execute(
                f"SELECT id, lead_id, user_id, author_name, comment, created_at "
                f"FROM {SCHEMA}.lead_comments WHERE lead_id = {int(rid)} ORDER BY created_at ASC"
            )
            comments = [dict(r) for r in cur.fetchall()]
            return _ok({'lead': dict(lead), 'comments': comments})

        cur.execute(f"SELECT * FROM {SCHEMA}.leads ORDER BY created_at DESC")
        return _ok({'leads': [dict(r) for r in cur.fetchall()]})

    body = json.loads(event.get('body') or '{}')

    if method == 'POST' and action == 'comment' and rid:
        comment = _safe(body.get('comment') or '', 2000)
        if not comment:
            return _err(400, 'Пустой комментарий')
        author = _safe(user['name'], 150)
        cur.execute(
            f"INSERT INTO {SCHEMA}.lead_comments (lead_id, user_id, author_name, comment) "
            f"VALUES ({int(rid)}, {user['id']}, '{author}', '{comment}')"
        )
        conn.commit()
        return _ok({'success': True})

    if method == 'PUT' and rid:
        fields = []
        if 'status' in body:
            fields.append(f"status = {_str_or_null(body['status'], 20)}")
        if 'assigned_to' in body:
            fields.append(f"assigned_to = {_int_or_null(body['assigned_to'])}")
        if not fields:
            return _err(400, 'Нет полей')
        cur.execute(f"UPDATE {SCHEMA}.leads SET {', '.join(fields)} WHERE id = {int(rid)}")
        conn.commit()
        return _ok({'success': True})

    return _err(400, 'Bad request')


def _users(cur, conn, method, rid, event, user):
    if method == 'GET':
        cur.execute(
            f"SELECT id, email, name, phone, role, avatar, is_active, created_at "
            f"FROM {SCHEMA}.users ORDER BY created_at DESC"
        )
        return _ok({'users': [dict(r) for r in cur.fetchall()]})

    body = json.loads(event.get('body') or '{}')

    if method == 'PUT' and rid:
        fields = []
        for f, length in [('name', 150), ('phone', 30), ('role', 20)]:
            if f in body:
                fields.append(f"{f} = {_str_or_null(body[f], length)}")
        if 'is_active' in body:
            fields.append(f"is_active = {_bool(body['is_active'])}")
        if 'password' in body and body['password']:
            import hashlib
            h = hashlib.sha256(body['password'].encode()).hexdigest()
            fields.append(f"password_hash = '{h}'")
        if not fields:
            return _err(400, 'Нет полей')
        fields.append("updated_at = NOW()")
        cur.execute(f"UPDATE {SCHEMA}.users SET {', '.join(fields)} WHERE id = {int(rid)}")
        conn.commit()
        return _ok({'success': True})

    if method == 'POST':
        import hashlib
        email = _safe((body.get('email') or '').lower(), 150)
        password = body.get('password') or ''
        name = _safe(body.get('name') or '', 150)
        role = _safe(body.get('role') or 'client', 20)
        if not email or not password or not name:
            return _err(400, 'Заполните email, пароль и имя')
        h = hashlib.sha256(password.encode()).hexdigest()
        cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE email = '{email}'")
        if cur.fetchone():
            return _err(409, 'Email уже используется')
        cur.execute(
            f"INSERT INTO {SCHEMA}.users (email, password_hash, name, role) "
            f"VALUES ('{email}', '{h}', '{name}', '{role}') RETURNING id"
        )
        conn.commit()
        return _ok({'id': cur.fetchone()['id'], 'success': True})

    return _err(400, 'Bad request')


def _pages(cur, conn, method, rid, event, user):
    if method == 'GET':
        cur.execute(f"SELECT * FROM {SCHEMA}.pages ORDER BY id ASC")
        return _ok({'pages': [dict(r) for r in cur.fetchall()]})

    body = json.loads(event.get('body') or '{}')

    if method == 'PUT' and rid:
        fields = []
        for f, length in [('title', 255), ('content', 50000), ('meta_description', 500)]:
            if f in body:
                fields.append(f"{f} = {_str_or_null(body[f], length)}")
        if 'published' in body:
            fields.append(f"published = {_bool(body['published'])}")
        if not fields:
            return _err(400, 'Нет полей')
        fields.append("updated_at = NOW()")
        cur.execute(f"UPDATE {SCHEMA}.pages SET {', '.join(fields)} WHERE id = {int(rid)}")
        conn.commit()
        return _ok({'success': True})

    if method == 'POST':
        slug = _safe(body.get('slug') or '', 100)
        title = _safe(body.get('title') or '', 255)
        content = _safe(body.get('content') or '', 50000)
        meta = _safe(body.get('meta_description') or '', 500)
        if not slug or not title:
            return _err(400, 'Нужны slug и title')
        cur.execute(
            f"INSERT INTO {SCHEMA}.pages (slug, title, content, meta_description) "
            f"VALUES ('{slug}', '{title}', '{content}', '{meta}') RETURNING id"
        )
        conn.commit()
        return _ok({'id': cur.fetchone()['id'], 'success': True})

    return _err(400, 'Bad request')


def _settings(cur, conn, method, event, user):
    if method == 'GET':
        cur.execute(f"SELECT * FROM {SCHEMA}.settings ORDER BY id ASC LIMIT 1")
        s = cur.fetchone()
        return _ok({'settings': dict(s) if s else {}})

    if method == 'PUT':
        body = json.loads(event.get('body') or '{}')
        fields = []
        for f, length in [('company_name', 255), ('company_phone', 30), ('company_email', 100),
                          ('company_address', 255), ('hero_title', 500), ('hero_subtitle', 1000),
                          ('about_text', 5000)]:
            if f in body:
                fields.append(f"{f} = {_str_or_null(body[f], length)}")
        if not fields:
            return _err(400, 'Нет полей')
        fields.append("updated_at = NOW()")
        cur.execute(f"UPDATE {SCHEMA}.settings SET {', '.join(fields)} WHERE id = (SELECT id FROM {SCHEMA}.settings ORDER BY id ASC LIMIT 1)")
        conn.commit()
        return _ok({'success': True})

    return _err(400, 'Bad request')


def _stats(cur):
    cur.execute(f"SELECT COUNT(*) AS c FROM {SCHEMA}.listings WHERE status = 'active'")
    listings_active = cur.fetchone()['c']
    cur.execute(f"SELECT COUNT(*) AS c FROM {SCHEMA}.leads")
    leads_total = cur.fetchone()['c']
    cur.execute(f"SELECT COUNT(*) AS c FROM {SCHEMA}.leads WHERE status = 'new'")
    leads_new = cur.fetchone()['c']
    cur.execute(f"SELECT COUNT(*) AS c FROM {SCHEMA}.users")
    users_total = cur.fetchone()['c']
    cur.execute(f"SELECT category, COUNT(*) AS c FROM {SCHEMA}.listings WHERE status = 'active' GROUP BY category")
    by_cat = [dict(r) for r in cur.fetchall()]
    cur.execute(f"SELECT status, COUNT(*) AS c FROM {SCHEMA}.leads GROUP BY status")
    by_status = [dict(r) for r in cur.fetchall()]
    return _ok({
        'listings_active': listings_active,
        'leads_total': leads_total,
        'leads_new': leads_new,
        'users_total': users_total,
        'by_category': by_cat,
        'leads_by_status': by_status,
    })


def _ser(row):
    if row.get('tags'):
        row['tags'] = [t.strip() for t in str(row['tags']).split(',') if t.strip()]
    else:
        row['tags'] = []
    for k in ('lat', 'lng'):
        if row.get(k) is not None:
            row[k] = float(row[k])
    return row
