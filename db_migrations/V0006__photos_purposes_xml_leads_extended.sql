-- Поля объявлений
ALTER TABLE t_p71821556_real_estate_catalog_.listings ADD COLUMN IF NOT EXISTS images TEXT;
ALTER TABLE t_p71821556_real_estate_catalog_.listings ADD COLUMN IF NOT EXISTS purpose VARCHAR(50);
ALTER TABLE t_p71821556_real_estate_catalog_.listings ADD COLUMN IF NOT EXISTS condition VARCHAR(50);
ALTER TABLE t_p71821556_real_estate_catalog_.listings ADD COLUMN IF NOT EXISTS parking VARCHAR(20);
ALTER TABLE t_p71821556_real_estate_catalog_.listings ADD COLUMN IF NOT EXISTS entrance VARCHAR(20);
ALTER TABLE t_p71821556_real_estate_catalog_.listings ADD COLUMN IF NOT EXISTS video_url VARCHAR(500);
ALTER TABLE t_p71821556_real_estate_catalog_.listings ADD COLUMN IF NOT EXISTS video_type VARCHAR(20);
ALTER TABLE t_p71821556_real_estate_catalog_.listings ADD COLUMN IF NOT EXISTS export_yandex BOOLEAN DEFAULT FALSE;
ALTER TABLE t_p71821556_real_estate_catalog_.listings ADD COLUMN IF NOT EXISTS export_avito BOOLEAN DEFAULT FALSE;
ALTER TABLE t_p71821556_real_estate_catalog_.listings ADD COLUMN IF NOT EXISTS export_cian BOOLEAN DEFAULT FALSE;

-- price_unit обновим: добавим вариант 'object' (за весь объект)
-- m2 / sotka / object

-- Настройки: водяной знак
ALTER TABLE t_p71821556_real_estate_catalog_.settings ADD COLUMN IF NOT EXISTS watermark_url VARCHAR(500);
ALTER TABLE t_p71821556_real_estate_catalog_.settings ADD COLUMN IF NOT EXISTS watermark_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE t_p71821556_real_estate_catalog_.settings ADD COLUMN IF NOT EXISTS watermark_opacity INTEGER DEFAULT 50;
ALTER TABLE t_p71821556_real_estate_catalog_.settings ADD COLUMN IF NOT EXISTS watermark_position VARCHAR(20) DEFAULT 'bottom-right';

-- Лиды: сетевой арендатор, запрашиваемая цена, лиды теперь могут быть без listing_id
ALTER TABLE t_p71821556_real_estate_catalog_.leads ADD COLUMN IF NOT EXISTS is_network BOOLEAN DEFAULT FALSE;
ALTER TABLE t_p71821556_real_estate_catalog_.leads ADD COLUMN IF NOT EXISTS budget INTEGER;
ALTER TABLE t_p71821556_real_estate_catalog_.leads ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;

-- Справочник назначений (purposes)
CREATE TABLE IF NOT EXISTS t_p71821556_real_estate_catalog_.purposes (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO t_p71821556_real_estate_catalog_.purposes (slug, name, sort_order) VALUES
('carwash', 'Автомойка', 1),
('sto', 'СТО / Автосервис', 2),
('shop', 'Магазин', 3),
('cafe', 'Кафе / Ресторан', 4),
('office', 'Офис', 5),
('beauty', 'Салон красоты', 6),
('medical', 'Медцентр / Клиника', 7),
('fitness', 'Фитнес / Спорт', 8),
('warehouse', 'Склад', 9),
('production', 'Производство', 10),
('hotel', 'Отель / Хостел', 11),
('education', 'Образование', 12),
('pharmacy', 'Аптека', 13),
('bank', 'Банк / Финансы', 14),
('free', 'Свободного назначения', 15)
ON CONFLICT (slug) DO NOTHING;

-- Настройки XML-экспорта (фиды для разных площадок)
CREATE TABLE IF NOT EXISTS t_p71821556_real_estate_catalog_.xml_feeds (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  format VARCHAR(20) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  filter_category VARCHAR(50),
  filter_deal VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO t_p71821556_real_estate_catalog_.xml_feeds (slug, name, format) VALUES
('yandex', 'Яндекс.Недвижимость', 'yandex'),
('avito', 'Авито', 'avito'),
('cian', 'ЦИАН', 'cian')
ON CONFLICT (slug) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_leads_network ON t_p71821556_real_estate_catalog_.leads(is_network);
CREATE INDEX IF NOT EXISTS idx_leads_public ON t_p71821556_real_estate_catalog_.leads(is_public);
CREATE INDEX IF NOT EXISTS idx_listings_purpose ON t_p71821556_real_estate_catalog_.listings(purpose);
