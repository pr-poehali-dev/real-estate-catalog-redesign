ALTER TABLE t_p71821556_real_estate_catalog_.listings
  ADD COLUMN IF NOT EXISTS is_exclusive boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_urgent boolean NOT NULL DEFAULT false;