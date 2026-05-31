-- ============================================================
-- Bakbokim v2 — Supabase Schema
-- Run this in your Supabase SQL Editor
-- Safe to run multiple times (idempotent)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ──────────────────────────────────────────────────────────
-- ORDERS TABLE
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number    TEXT NOT NULL,
  customer_name   TEXT,
  phone           TEXT,
  distribution_station TEXT,
  items           JSONB DEFAULT '[]',
  raw_row         JSONB DEFAULT '{}',
  sheet_name      TEXT,
  excel_source    TEXT,
  whatsapp_sent   BOOLEAN NOT NULL DEFAULT FALSE,
  whatsapp_sent_at TIMESTAMPTZ,
  delivered       BOOLEAN NOT NULL DEFAULT FALSE,
  delivered_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT orders_unique UNIQUE (order_number, phone)
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders (customer_name);
CREATE INDEX IF NOT EXISTS idx_orders_phone    ON orders (phone);
CREATE INDEX IF NOT EXISTS idx_orders_station  ON orders (distribution_station);
CREATE INDEX IF NOT EXISTS idx_orders_created  ON orders (created_at DESC);

-- ──────────────────────────────────────────────────────────
-- WINE IMAGES CACHE TABLE
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wine_images (
  wine_name   TEXT PRIMARY KEY,
  image_url   TEXT NOT NULL,
  source      TEXT NOT NULL DEFAULT 'web',
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- SETTINGS TABLE
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO settings (key, value) VALUES
  ('senderName',    'רון'),
  ('projectName',   'Bakbokim Project'),
  ('city',          'נתניה'),
  ('pickupAddress', 'סמילנסקי 79'),
  ('calendarLink',  'https://calendar.app.google/npZiCDk8WMTdNdY6'),
  ('messageTemplate', E'Hello {{name}}\nThis is {{senderName}} from *Bakbokim Project* in {{city}}. Your order {{orderNum}} is ready!\n\n*Order:*\n{{items}}\n\nPickup: {{calendarLink}}\n*Address:* _{{address}}, {{city}}_\n\n---\n\nשלום {{name}}\n{{senderName}} מ-*פרויקט בקבוקים* ב{{city}}. ההזמנה {{orderNum}} מוכנה!\n\n*פירוט:*\n{{items}}\n\nתיאום: {{calendarLink}}\n*כתובת:* _{{address}}, {{city}}_'),
  ('wineSearchUrl', '')
ON CONFLICT (key) DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ──────────────────────────────────────────────────────────
ALTER TABLE orders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE wine_images  ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all_orders"      ON orders;
DROP POLICY IF EXISTS "auth_all_wine_images" ON wine_images;
DROP POLICY IF EXISTS "auth_all_settings"    ON settings;

CREATE POLICY "auth_all_orders"      ON orders      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_wine_images" ON wine_images FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_settings"    ON settings    FOR ALL TO authenticated USING (true) WITH CHECK (true);

