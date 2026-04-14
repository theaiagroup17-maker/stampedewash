import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { SEED_SITES } from '@/lib/constants';

export const maxDuration = 60;

async function seedSites(origin: string) {
  console.log('[seed] Starting site seed...');
  const supabase = createServerClient();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Check if sites already exist
  const { data: existing } = await supabase.from('sites').select('id').limit(1);
  if (existing && existing.length > 0) {
    console.log('[seed] Sites already exist, skipping');
    return { message: 'Sites already seeded', count: 0 };
  }

  const sites = [];

  for (let i = 0; i < SEED_SITES.length; i++) {
    const [lng, lat] = SEED_SITES[i];
    let address: string | null = null;

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
      name, address, lat, lng, notes,
      status: 'potential' as const,
      research_status: 'pending' as const,
    });
  }

  const { data: inserted, error } = await supabase
    .from('sites')
    .insert(sites)
    .select('id');

  if (error) throw error;

  // Fire and forget research for each site
  if (inserted) {
    for (const site of inserted) {
      fetch(`${origin}/api/research/${site.id}`, { method: 'POST' }).catch(() => {});
    }
  }

  console.log(`[seed] Seeded ${inserted?.length || 0} sites, research triggered`);
  return { count: inserted?.length || 0, message: 'Sites seeded. Research running in background.' };
}

export async function POST(req: NextRequest) {
  try {
    const result = await seedSites(req.nextUrl.origin);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[seed] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const result = await seedSites(req.nextUrl.origin);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[seed] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
