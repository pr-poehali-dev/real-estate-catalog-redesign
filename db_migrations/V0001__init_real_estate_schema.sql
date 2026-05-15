CREATE TABLE IF NOT EXISTS t_p71821556_real_estate_catalog_.categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  icon VARCHAR(20),
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p71821556_real_estate_catalog_.listings (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  deal VARCHAR(20) NOT NULL,
  price BIGINT NOT NULL,
  price_per_m2 INTEGER,
  area INTEGER NOT NULL,
  payback INTEGER,
  profit INTEGER,
  floor INTEGER,
  total_floors INTEGER,
  address VARCHAR(255),
  district VARCHAR(100),
  lat DECIMAL(10,6),
  lng DECIMAL(10,6),
  image VARCHAR(500),
  tags TEXT,
  is_hot BOOLEAN DEFAULT FALSE,
  is_new BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p71821556_real_estate_catalog_.leads (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(100),
  message TEXT,
  listing_id INTEGER,
  source VARCHAR(50) DEFAULT 'site',
  status VARCHAR(20) DEFAULT 'new',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p71821556_real_estate_catalog_.pages (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(255),
  content TEXT,
  meta_description TEXT,
  published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p71821556_real_estate_catalog_.settings (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255) DEFAULT 'BIZNEST',
  company_phone VARCHAR(30),
  company_email VARCHAR(100),
  company_address VARCHAR(255),
  hero_title TEXT,
  hero_subtitle TEXT,
  about_text TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listings_category ON t_p71821556_real_estate_catalog_.listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_deal ON t_p71821556_real_estate_catalog_.listings(deal);
CREATE INDEX IF NOT EXISTS idx_listings_status ON t_p71821556_real_estate_catalog_.listings(status);
CREATE INDEX IF NOT EXISTS idx_leads_status ON t_p71821556_real_estate_catalog_.leads(status);

INSERT INTO t_p71821556_real_estate_catalog_.categories (name, slug, icon, description, sort_order) VALUES
('Офисы', 'office', '🏢', 'Офисные помещения класса A, B, B+', 1),
('Торговля', 'retail', '🛒', 'Стрит-ритейл и торговые площади', 2),
('Склады', 'warehouse', '🏭', 'Складские комплексы и логистика', 3),
('Рестораны', 'restaurant', '🍽️', 'Помещения общепита', 4),
('Готовый бизнес', 'business', '💼', 'Действующий бизнес под ключ', 5),
('Производство', 'production', '⚙️', 'Производственные цеха', 6);

INSERT INTO t_p71821556_real_estate_catalog_.listings (title, description, category, deal, price, price_per_m2, area, payback, profit, floor, total_floors, address, district, lat, lng, image, tags, is_hot, is_new) VALUES
('Офисный центр "Премиум Плаза"', 'Современный офисный центр класса A с отделкой премиум уровня, собственной парковкой на 20 машин и круглосуточной охраной.', 'office', 'sale', 67500000, 150000, 450, NULL, NULL, 5, 12, 'ул. Тверская, 12, Москва', 'ЦАО', 55.764, 37.606, 'https://cdn.poehali.dev/projects/4bce74f4-4dd7-424e-85e7-ff08f8399357/files/11d13912-4216-4a73-9faf-309117250f99.jpg', 'Класс A,Парковка,Охрана', TRUE, FALSE),
('Ресторан с оборудованием', 'Действующий ресторан на 80 посадочных мест с полным комплектом кухонного оборудования.', 'restaurant', 'business', 8500000, NULL, 180, 18, 480000, NULL, NULL, 'Арбат, 28, Москва', 'ЦАО', 55.751, 37.591, 'https://cdn.poehali.dev/projects/4bce74f4-4dd7-424e-85e7-ff08f8399357/files/b39b9336-f780-4ce4-aa0a-7c916796da5f.jpg', 'Готовый бизнес,Оборудование,Аренда 5 лет', FALSE, TRUE),
('Торговое помещение на 1 этаже', 'Угловое торговое помещение с двумя витринами на оживлённом проспекте.', 'retail', 'rent', 240000, 2000, 120, NULL, NULL, 1, NULL, 'пр. Мира, 56, Москва', 'СВАО', 55.787, 37.638, 'https://cdn.poehali.dev/projects/4bce74f4-4dd7-424e-85e7-ff08f8399357/files/1acdf853-ec1f-4b29-84ba-d7230d412ca6.jpg', 'Угловое,Витрина,Трафик 8000/день', FALSE, FALSE),
('Склад с офисом', 'Тёплый склад класса B+ с встроенным офисом 60 м², пандусом для грузовиков и охраняемой территорией.', 'warehouse', 'rent', 560000, 700, 800, NULL, NULL, NULL, NULL, 'Варшавское шоссе, 125, Москва', 'ЮАО', 55.638, 37.618, 'https://cdn.poehali.dev/projects/4bce74f4-4dd7-424e-85e7-ff08f8399357/files/11d13912-4216-4a73-9faf-309117250f99.jpg', 'Отопление,КПП,Пандус', FALSE, FALSE),
('Сеть кофеен CafeGo', 'Сеть из 4 кофеен с собственной CRM, системой учёта и обученным персоналом.', 'business', 'business', 22000000, NULL, 320, 24, 920000, NULL, NULL, 'Различные адреса, Москва', 'Несколько районов', 55.758, 37.620, 'https://cdn.poehali.dev/projects/4bce74f4-4dd7-424e-85e7-ff08f8399357/files/b39b9336-f780-4ce4-aa0a-7c916796da5f.jpg', '4 точки,Франшиза,CRM система', TRUE, FALSE),
('Производственный цех', 'Производственный цех высотой 8 метров с кран-балкой 5т, электричеством 380В и железнодорожной веткой.', 'production', 'sale', 45000000, 37500, 1200, NULL, NULL, NULL, NULL, 'ул. Промышленная, 8, Химки', 'Подмосковье', 55.887, 37.440, 'https://cdn.poehali.dev/projects/4bce74f4-4dd7-424e-85e7-ff08f8399357/files/1acdf853-ec1f-4b29-84ba-d7230d412ca6.jpg', '380В,Кран-балка,Ж/Д ветка', FALSE, TRUE);

INSERT INTO t_p71821556_real_estate_catalog_.settings (company_name, company_phone, company_email, company_address, hero_title, hero_subtitle, about_text) VALUES
('BIZNEST', '+7 (495) 123-45-67', 'info@biznest.ru', 'Москва, ул. Тверская, 1', 'Коммерческая недвижимость и готовый бизнес', 'Более 1 240 объектов в Москве и Подмосковье.', 'BIZNEST — агентство коммерческой недвижимости с 12-летним опытом на рынке.');

INSERT INTO t_p71821556_real_estate_catalog_.pages (slug, title, content, meta_description) VALUES
('about', 'О компании', 'BIZNEST — ведущее агентство коммерческой недвижимости.', 'Информация о компании BIZNEST'),
('contacts', 'Контакты', 'Свяжитесь с нами по телефону или через форму.', 'Контакты BIZNEST');
