"""
Business: API для каталога коммерческой недвижимости — список и детали объектов.
Args: event с httpMethod (GET), queryStringParameters (category, deal, search, min_area, max_price, id); context
Returns: HTTP-ответ с JSON массивом объектов или одним объектом
"""

import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor


def handler(event: dict, context) -> dict:
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400',
            },
            'body': '',
        }

    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
        }

    params = event.get('queryStringParameters') or {}
    dsn = os.environ['DATABASE_URL']

    conn = psycopg2.connect(dsn)
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            listing_id = params.get('id')
            if listing_id:
                cur.execute(
                    "SELECT * FROM t_p71821556_real_estate_catalog_.listings WHERE id = "
                    + str(int(listing_id))
                )
                row = cur.fetchone()
                if not row:
                    return {
                        'statusCode': 404,
                        'headers': {'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Not found'}),
                    }
                item = _serialize(dict(row))
                return _ok({'listing': item})

            where = ["status = 'active'"]
            category = params.get('category')
            deal = params.get('deal')
            search = params.get('search')
            min_area = params.get('min_area')
            max_price = params.get('max_price')

            if category and category != 'all':
                cat_safe = category.replace("'", "''")
                where.append(f"category = '{cat_safe}'")
            if deal and deal != 'all':
                deal_safe = deal.replace("'", "''")
                where.append(f"deal = '{deal_safe}'")
            if search:
                s = search.replace("'", "''").lower()
                where.append(
                    f"(LOWER(title) LIKE '%{s}%' OR LOWER(address) LIKE '%{s}%' OR LOWER(district) LIKE '%{s}%')"
                )
            if min_area:
                try:
                    where.append(f"area >= {int(min_area)}")
                except ValueError:
                    pass
            if max_price:
                try:
                    where.append(f"price <= {int(max_price)}")
                except ValueError:
                    pass

            sql = (
                "SELECT * FROM t_p71821556_real_estate_catalog_.listings WHERE "
                + " AND ".join(where)
                + " ORDER BY is_hot DESC, is_new DESC, created_at DESC"
            )
            cur.execute(sql)
            rows = cur.fetchall()
            items = [_serialize(dict(r)) for r in rows]

            return _ok({'listings': items, 'total': len(items)})
    finally:
        conn.close()


def _serialize(row: dict) -> dict:
    if row.get('tags'):
        row['tags'] = [t.strip() for t in str(row['tags']).split(',') if t.strip()]
    else:
        row['tags'] = []
    for k in ('lat', 'lng'):
        if row.get(k) is not None:
            row[k] = float(row[k])
    for k in ('created_at', 'updated_at'):
        if row.get(k) is not None:
            row[k] = row[k].isoformat()
    return row


def _ok(body: dict) -> dict:
    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
        },
        'body': json.dumps(body, ensure_ascii=False),
    }
