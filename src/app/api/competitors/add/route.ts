// Migration: Run in Supabase SQL Editor:
// ALTER TABLE competitors ADD COLUMN IF NOT EXISTS status text DEFAULT 'existing';
// ALTER TABLE competitors ADD COLUMN IF NOT EXISTS notes text;

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await req.json();
    const geoKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!body.name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });

    let { lat, lng } = body;

    // Geocode if missing coordinates
    if ((!lat || !lng) && body.address && geoKey) {
      try {
        const geoRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(body.address + ', Alberta, Canada')}&key=${geoKey}`);
        const geoData = await geoRes.json();
        if (geoData.results?.[0]) {
          lat = geoData.results[0].geometry.location.lat;
          lng = geoData.results[0].geometry.location.lng;
        }
      } catch {}
    }

    const { data, error } = await supabase.from('competitors').insert({
      name: body.name.trim(),
      brand: body.brand || 'oth',
      address: body.address || null,
      city: body.city || 'Calgary',
      wash_type: body.wash_type || 'automatic',
      status: body.status || 'existing',
      notes: body.notes || null,
      lat: lat || null,
      lng: lng || null,
      verified: false,
    }).select().single();

    if (error) throw error;
    return NextResponse.json({ competitor: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
