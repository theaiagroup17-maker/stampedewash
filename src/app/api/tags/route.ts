// Migration: Run in Supabase SQL Editor:
// CREATE TABLE IF NOT EXISTS tags (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, color text NOT NULL DEFAULT '#6B7280', created_at timestamptz DEFAULT now());
// CREATE TABLE IF NOT EXISTS site_tags (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), site_id uuid REFERENCES sites(id) ON DELETE CASCADE, tag_id uuid REFERENCES tags(id) ON DELETE CASCADE, created_at timestamptz DEFAULT now(), UNIQUE(site_id, tag_id));
// ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
// ALTER TABLE site_tags ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "Allow all on tags" ON tags FOR ALL USING (true) WITH CHECK (true);
// CREATE POLICY "Allow all on site_tags" ON site_tags FOR ALL USING (true) WITH CHECK (true);
// ALTER PUBLICATION supabase_realtime ADD TABLE tags;
// ALTER PUBLICATION supabase_realtime ADD TABLE site_tags;

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

const DEFAULT_TAGS = [
  { name: 'Costco Site', color: '#0033A0' },
  { name: 'High Traffic', color: '#16A34A' },
  { name: 'Corner Lot', color: '#EA580C' },
  { name: 'Highway Access', color: '#7C3AED' },
  { name: 'Under Review', color: '#EAB308' },
  { name: 'Priority', color: '#CC0000' },
];

export async function GET() {
  try {
    const supabase = createServerClient();

    // Seed defaults if empty
    const { data: existing } = await supabase.from('tags').select('id').limit(1);
    if (!existing || existing.length === 0) {
      for (const tag of DEFAULT_TAGS) {
        await supabase.from('tags').insert(tag);
      }
    }

    const { data: tags, error } = await supabase.from('tags').select('*').order('name');
    if (error) throw error;

    // Get site counts per tag
    const { data: siteTags } = await supabase.from('site_tags').select('tag_id');
    const counts: Record<string, number> = {};
    if (siteTags) siteTags.forEach(st => { counts[st.tag_id] = (counts[st.tag_id] || 0) + 1; });

    const tagsWithCounts = (tags || []).map(t => ({ ...t, site_count: counts[t.id] || 0 }));
    return NextResponse.json({ tags: tagsWithCounts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const { name, color } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });

    const { data, error } = await supabase.from('tags')
      .insert({ name: name.trim(), color: color || '#6B7280' })
      .select().single();
    if (error) throw error;
    return NextResponse.json({ tag: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
