"""
Платёжный модуль: генерация ссылок на оплату через ЮКассу.
Сохранение платежей, проверка статуса.
"""
import json
import os
import uuid
import psycopg2
import urllib.request
import base64


CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
}

ALLOWED_ROLES = ('admin', 'director', 'broker', 'office_manager', 'manager')


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def ok(data):
    return {'statusCode': 200, 'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'}, 'body': json.dumps(data, default=str)}


def err(msg, status=400):
    return {'statusCode': status, 'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'}, 'body': json.dumps({'error': msg})}


def get_user(token, conn):
    if not token:
        return None
    cur = conn.cursor()
    cur.execute(
        "SELECT u.id, u.name, u.role FROM sessions s JOIN users u ON u.id = s.user_id "
        "WHERE s.token = %s AND s.expires_at > NOW() AND u.is_active = TRUE",
        (token,)
    )
    row = cur.fetchone()
    return {'id': row[0], 'name': row[1], 'role': row[2]} if row else None


def create_yookassa_payment(amount, description, return_url, shop_id, secret_key):
    idempotency_key = str(uuid.uuid4())
    payload = {
        'amount': {'value': f'{float(amount):.2f}', 'currency': 'RUB'},
        'confirmation': {'type': 'redirect', 'return_url': return_url},
        'capture': True,
        'description': description[:128],
    }
    data = json.dumps(payload).encode('utf-8')
    credentials = base64.b64encode(f'{shop_id}:{secret_key}'.encode()).decode()
    req = urllib.request.Request(
        'https://api.yookassa.ru/v3/payments',
        data=data,
        headers={
            'Authorization': f'Basic {credentials}',
            'Content-Type': 'application/json',
            'Idempotence-Key': idempotency_key,
        },
        method='POST'
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode())


def get_yookassa_payment(payment_id, shop_id, secret_key):
    credentials = base64.b64encode(f'{shop_id}:{secret_key}'.encode()).decode()
    req = urllib.request.Request(
        f'https://api.yookassa.ru/v3/payments/{payment_id}',
        headers={'Authorization': f'Basic {credentials}'},
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode())


def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    token = event.get('headers', {}).get('x-auth-token') or event.get('headers', {}).get('X-Auth-Token')
    method = event.get('httpMethod', 'GET')
    path_parts = [p for p in event.get('path', '/').split('/') if p]
    qs = event.get('queryStringParameters') or {}
    body = json.loads(event['body']) if event.get('body') else {}

    conn = get_conn()
    user = get_user(token, conn)

    if not user or user['role'] not in ALLOWED_ROLES:
        conn.close()
        return err('Нет доступа', 403)

    resource_id = int(path_parts[0]) if path_parts and path_parts[0].isdigit() else None

    shop_id = os.environ.get('YOOKASSA_SHOP_ID', '')
    secret_key = os.environ.get('YOOKASSA_SECRET_KEY', '')

    try:
        cur = conn.cursor()

        if method == 'GET' and not resource_id:
            page = int(qs.get('page', 1))
            limit = int(qs.get('limit', 30))
            offset = (page - 1) * limit
            cur.execute("""
                SELECT p.id, p.deal_id, d.title as deal_title,
                       p.owner_id, o.name as owner_name,
                       p.amount, p.description, p.yookassa_payment_id, p.yookassa_url,
                       p.status, p.created_at, u.name as creator
                FROM crm_payments p
                LEFT JOIN crm_deals d ON d.id = p.deal_id
                LEFT JOIN crm_owners o ON o.id = p.owner_id
                LEFT JOIN users u ON u.id = p.created_by
                ORDER BY p.created_at DESC LIMIT %s OFFSET %s
            """, (limit, offset))
            rows = cur.fetchall()
            cur.execute("SELECT COUNT(*) FROM crm_payments")
            total = cur.fetchone()[0]
            payments = [{
                'id': r[0], 'deal_id': r[1], 'deal_title': r[2],
                'owner_id': r[3], 'owner_name': r[4],
                'amount': float(r[5]), 'description': r[6],
                'yookassa_payment_id': r[7], 'yookassa_url': r[8],
                'status': r[9], 'created_at': r[10], 'creator': r[11]
            } for r in rows]
            conn.close()
            return ok({'payments': payments, 'total': total})

        if method == 'GET' and resource_id:
            cur.execute("SELECT yookassa_payment_id, status FROM crm_payments WHERE id = %s", (resource_id,))
            row = cur.fetchone()
            if not row:
                conn.close()
                return err('Не найдено', 404)
            yk_id, status = row
            if yk_id and status == 'pending' and shop_id and secret_key:
                try:
                    yk_data = get_yookassa_payment(yk_id, shop_id, secret_key)
                    new_status = yk_data.get('status', status)
                    if new_status != status:
                        cur.execute(
                            "UPDATE crm_payments SET status=%s, updated_at=NOW() WHERE id=%s",
                            (new_status, resource_id)
                        )
                        conn.commit()
                    status = new_status
                except Exception:
                    pass
            conn.close()
            return ok({'status': status})

        if method == 'POST':
            amount = body.get('amount')
            description = body.get('description', 'Оплата услуг агентства')
            if not amount or float(amount) <= 0:
                conn.close()
                return err('Сумма обязательна')

            return_url = body.get('return_url', 'https://biznest.ru/admin')
            yookassa_url = None
            yookassa_payment_id = None

            if shop_id and secret_key:
                try:
                    yk = create_yookassa_payment(amount, description, return_url, shop_id, secret_key)
                    yookassa_payment_id = yk.get('id')
                    yookassa_url = yk.get('confirmation', {}).get('confirmation_url')
                except Exception as e:
                    conn.close()
                    return err(f'ЮКасса: {str(e)}')
            else:
                yookassa_url = f'https://yookassa.ru/demo/payment?amount={amount}'

            cur.execute(
                "INSERT INTO crm_payments (deal_id, owner_id, amount, description, yookassa_payment_id, yookassa_url, created_by) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id",
                (body.get('deal_id'), body.get('owner_id'), float(amount), description,
                 yookassa_payment_id, yookassa_url, user['id'])
            )
            new_id = cur.fetchone()[0]
            conn.commit()
            conn.close()
            return ok({'id': new_id, 'payment_url': yookassa_url, 'payment_id': yookassa_payment_id}, 201)

    except Exception as e:
        conn.rollback()
        conn.close()
        return err(str(e), 500)
