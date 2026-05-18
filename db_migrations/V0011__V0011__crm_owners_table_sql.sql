CREATE TABLE IF NOT EXISTS crm_owners (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone_normalized TEXT,
  email TEXT,
  company TEXT,
  inn TEXT,
  source TEXT DEFAULT 'manual',
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
