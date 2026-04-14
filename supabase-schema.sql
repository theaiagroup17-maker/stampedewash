-- Stampede Wash — Supabase Schema
-- Run this in the Supabase SQL Editor to set up all tables

-- Sites table
CREATE TABLE IF NOT EXISTS sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  lat float NOT NULL,
  lng float NOT NULL,
  google_maps_url text,
  notes text,
  status text NOT NULL DEFAULT 'potential'
    CHECK (status IN ('potential', 'ruled_out', 'under_negotiation')),
  created_at timestamptz NOT NULL DEFAULT now(),
  research_data jsonb,
  research_status text NOT NULL DEFAULT 'pending'
    CHECK (research_status IN ('pending', 'running', 'complete', 'failed')),
  last_researched_at timestamptz
);

-- Rankings table
CREATE TABLE IF NOT EXISTS rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  rank integer CHECK (rank IS NULL OR (rank >= 1 AND rank <= 10)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, user_name)
);

-- Competitors table
CREATE TABLE IF NOT EXISTS competitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brand text NOT NULL,
  address text,
  lat float,
  lng float,
  city text CHECK (city IN ('Calgary', 'Airdrie', 'Cochrane', 'Okotoks', 'Tsuut''ina')),
  wash_type text CHECK (wash_type IN ('tunnel', 'automatic', 'express', 'full_service', 'detail')),
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Disable RLS on all tables (internal tool)
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;

-- Create permissive policies that allow all operations
CREATE POLICY "Allow all on sites" ON sites FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on rankings" ON rankings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on competitors" ON competitors FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime on all tables
ALTER PUBLICATION supabase_realtime ADD TABLE sites;
ALTER PUBLICATION supabase_realtime ADD TABLE rankings;
ALTER PUBLICATION supabase_realtime ADD TABLE competitors;

-- Index for faster ranking lookups
CREATE INDEX IF NOT EXISTS idx_rankings_site_id ON rankings(site_id);
CREATE INDEX IF NOT EXISTS idx_rankings_user_name ON rankings(user_name);
CREATE INDEX IF NOT EXISTS idx_competitors_brand ON competitors(brand);
CREATE INDEX IF NOT EXISTS idx_competitors_city ON competitors(city);

-- Unique constraint for competitor upserts
-- Run this if adding to an existing table: ALTER TABLE competitors ADD CONSTRAINT competitors_name_address_unique UNIQUE (name, address);
ALTER TABLE competitors ADD CONSTRAINT IF NOT EXISTS competitors_name_address_unique UNIQUE (name, address);

-- Competitor status and notes columns
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS status text DEFAULT 'existing';
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS notes text;

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#6B7280',
  created_at timestamptz DEFAULT now()
);

-- Site-tags junction table
CREATE TABLE IF NOT EXISTS site_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES sites(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(site_id, tag_id)
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on tags" ON tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on site_tags" ON site_tags FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE tags;
ALTER PUBLICATION supabase_realtime ADD TABLE site_tags;
