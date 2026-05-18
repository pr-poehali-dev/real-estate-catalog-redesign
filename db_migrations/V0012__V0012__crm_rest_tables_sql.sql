CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_owners_phone_unique
  ON crm_owners(regexp_replace(phone, '[^0-9]', '', 'g'));

CREATE TABLE IF NOT EXISTS crm_owner_listings (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER REFERENCES crm_owners(id),
  listing_id INTEGER REFERENCES listings(id),
  role TEXT DEFAULT 'owner',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner_id, listing_id)
);

CREATE TABLE IF NOT EXISTS crm_stages (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  position INTEGER NOT NULL DEFAULT 0,
  is_terminal BOOLEAN DEFAULT FALSE,
  is_win BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO crm_stages (name, color, position, is_terminal, is_win) VALUES
  ('Новый лид', '#94a3b8', 0, false, false),
  ('Переговоры', '#3b82f6', 1, false, false),
  ('Показ', '#8b5cf6', 2, false, false),
  ('КП отправлено', '#f59e0b', 3, false, false),
  ('Договор', '#10b981', 4, false, false),
  ('Успешно', '#22c55e', 5, true, true),
  ('Отказ', '#ef4444', 6, true, false);

CREATE TABLE IF NOT EXISTS crm_deals (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  stage_id INTEGER REFERENCES crm_stages(id),
  owner_id INTEGER REFERENCES crm_owners(id),
  listing_id INTEGER REFERENCES listings(id),
  assigned_to INTEGER REFERENCES users(id),
  amount NUMERIC(15,2),
  commission NUMERIC(15,2),
  source TEXT,
  notes TEXT,
  closed_at TIMESTAMPTZ,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_deals_stage ON crm_deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_assigned ON crm_deals(assigned_to);

CREATE TABLE IF NOT EXISTS crm_activities (
  id SERIAL PRIMARY KEY,
  deal_id INTEGER REFERENCES crm_deals(id),
  owner_id INTEGER REFERENCES crm_owners(id),
  user_id INTEGER REFERENCES users(id),
  type TEXT NOT NULL,
  content TEXT,
  scheduled_at TIMESTAMPTZ,
  done_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_activities_deal ON crm_activities(deal_id);

CREATE TABLE IF NOT EXISTS crm_points (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  points INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  deal_id INTEGER REFERENCES crm_deals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_points_user ON crm_points(user_id);

CREATE TABLE IF NOT EXISTS crm_payments (
  id SERIAL PRIMARY KEY,
  deal_id INTEGER REFERENCES crm_deals(id),
  owner_id INTEGER REFERENCES crm_owners(id),
  amount NUMERIC(15,2) NOT NULL,
  description TEXT,
  yookassa_payment_id TEXT,
  yookassa_url TEXT,
  status TEXT DEFAULT 'pending',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_checks_cache (
  id SERIAL PRIMARY KEY,
  check_type TEXT NOT NULL,
  query_key TEXT NOT NULL,
  source TEXT NOT NULL,
  result JSONB NOT NULL,
  requested_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  UNIQUE(check_type, query_key, source)
);

CREATE INDEX IF NOT EXISTS idx_crm_checks_cache_key ON crm_checks_cache(check_type, query_key, source);

CREATE TABLE IF NOT EXISTS crm_api_quota (
  id SERIAL PRIMARY KEY,
  source TEXT NOT NULL UNIQUE,
  requests_used INTEGER DEFAULT 0,
  requests_limit INTEGER DEFAULT 1000,
  period_start TIMESTAMPTZ DEFAULT date_trunc('month', NOW()),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO crm_api_quota (source, requests_limit) VALUES
  ('bezopasno', 100),
  ('newdb', 500),
  ('zachestny', 1000)
ON CONFLICT (source) DO NOTHING;
