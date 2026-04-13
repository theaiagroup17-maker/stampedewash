import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { SEED_SITES } from '@/lib/constants';

export const maxDuration = 60;

export async function POST(_req: NextRequest) {
  try {
    const supabase = createServerClient();
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    // Check if sites already exist
    const { data: existing } = await supabase.from('sites').select('id').limit(1);
    if (existing && existing.length > 0) {
      return NextResponse.json({ message: 'Sites already seeded', count: 0 });
    }

    const sites = [];

    for (let i = 0; i < SEED_SITES.length; i++) {
      const [lng, lat] = SEED_SITES[i];
      let address: string | null = null;

      // Reverse geocode
      if (apiKey) {
        try {
          const geoRes = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
          );
          const geoData = await geoRes.json();
          address = geoData.results?.[0]?.formatted_address || null;
        } catch {}
      }

      const name = `Stampede Wash - Site ${i + 1}`;
      const notes = (i === 7) ? '⚠️ Possible duplicate of Site 7 (near-identical coordinates)' : null;

      sites.push({
        name,
        address,
        lat,
        lng,
        notes,
        status: 'potential' as const,
        research_status: 'pending' as const,
      });
    }

    const { data: inserted, error } = await supabase
      .from('sites')
      .insert(sites)
      .select('id');

    if (error) throw error;

    return NextResponse.json({ count: inserted?.length || 0, message: 'Sites seeded successfully.' });
  } catch (err: any) {
    console.error('Seed error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
