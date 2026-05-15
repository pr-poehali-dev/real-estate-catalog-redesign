CREATE TABLE IF NOT EXISTS t_p71821556_real_estate_catalog_.users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(30),
  role VARCHAR(20) NOT NULL DEFAULT 'client',
  avatar VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p71821556_real_estate_catalog_.sessions (
  token VARCHAR(100) PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS t_p71821556_real_estate_catalog_.lead_comments (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL,
  user_id INTEGER,
  author_name VARCHAR(150),
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p71821556_real_estate_catalog_.ai_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  action VARCHAR(50) NOT NULL,
  prompt TEXT,
  response TEXT,
  tokens INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON t_p71821556_real_estate_catalog_.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON t_p71821556_real_estate_catalog_.users(role);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON t_p71821556_real_estate_catalog_.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_comments_lead ON t_p71821556_real_estate_catalog_.lead_comments(lead_id);

ALTER TABLE t_p71821556_real_estate_catalog_.listings ADD COLUMN IF NOT EXISTS author_id INTEGER;
ALTER TABLE t_p71821556_real_estate_catalog_.leads ADD COLUMN IF NOT EXISTS assigned_to INTEGER;
ALTER TABLE t_p71821556_real_estate_catalog_.leads ADD COLUMN IF NOT EXISTS user_id INTEGER;

INSERT INTO t_p71821556_real_estate_catalog_.users (email, password_hash, name, role) VALUES
('admin@biznest.ru', 'b3a8e0e1f9ab1bee3a7e9aef7b9ace8c79fc7e91dec1f37c6b7c2c5e44b30b8a', 'Главный администратор', 'admin'),
('editor@biznest.ru', 'b3a8e0e1f9ab1bee3a7e9aef7b9ace8c79fc7e91dec1f37c6b7c2c5e44b30b8a', 'Редактор контента', 'editor'),
('manager@biznest.ru', 'b3a8e0e1f9ab1bee3a7e9aef7b9ace8c79fc7e91dec1f37c6b7c2c5e44b30b8a', 'Менеджер по продажам', 'manager'),
('client@biznest.ru', 'b3a8e0e1f9ab1bee3a7e9aef7b9ace8c79fc7e91dec1f37c6b7c2c5e44b30b8a', 'Клиент Тестовый', 'client');
