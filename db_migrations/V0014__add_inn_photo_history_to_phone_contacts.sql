ALTER TABLE t_p71821556_real_estate_catalog_.phone_contacts
  ADD COLUMN IF NOT EXISTS inn VARCHAR(12),
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

CREATE TABLE IF NOT EXISTS t_p71821556_real_estate_catalog_.phone_contact_history (
  id SERIAL PRIMARY KEY,
  phone_contact_id INTEGER NOT NULL REFERENCES t_p71821556_real_estate_catalog_.phone_contacts(id),
  changed_by INTEGER REFERENCES t_p71821556_real_estate_catalog_.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  field_name VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT
);

CREATE INDEX IF NOT EXISTS idx_phone_history_contact ON t_p71821556_real_estate_catalog_.phone_contact_history(phone_contact_id);
