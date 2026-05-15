ALTER TABLE t_p71821556_real_estate_catalog_.listings ADD COLUMN IF NOT EXISTS owner_name VARCHAR(150);
ALTER TABLE t_p71821556_real_estate_catalog_.listings ADD COLUMN IF NOT EXISTS owner_phone VARCHAR(30);
ALTER TABLE t_p71821556_real_estate_catalog_.listings ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT 'Краснодар';
ALTER TABLE t_p71821556_real_estate_catalog_.listings ADD COLUMN IF NOT EXISTS price_unit VARCHAR(10) DEFAULT 'm2';

ALTER TABLE t_p71821556_real_estate_catalog_.settings ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);
ALTER TABLE t_p71821556_real_estate_catalog_.settings ADD COLUMN IF NOT EXISTS main_city VARCHAR(100) DEFAULT 'Краснодар';

CREATE TABLE IF NOT EXISTS t_p71821556_real_estate_catalog_.cities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  region VARCHAR(150),
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listings_city ON t_p71821556_real_estate_catalog_.listings(city);

UPDATE t_p71821556_real_estate_catalog_.listings SET city = 'Краснодар' WHERE city IS NULL;
UPDATE t_p71821556_real_estate_catalog_.settings SET main_city = 'Краснодар' WHERE main_city IS NULL;

INSERT INTO t_p71821556_real_estate_catalog_.cities (name, region, sort_order) VALUES
('Краснодар', 'Краснодарский край', 1),
('Сочи', 'Краснодарский край', 2),
('Новороссийск', 'Краснодарский край', 3),
('Анапа', 'Краснодарский край', 4),
('Москва', 'Москва', 5),
('Санкт-Петербург', 'Санкт-Петербург', 6)
ON CONFLICT (name) DO NOTHING;
