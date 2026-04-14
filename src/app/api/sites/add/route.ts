import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

function extractCoordsFromUrl(url: string): { lat: number; lng: number } | null {
  const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };

  const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };

  const dataMatch = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
  if (dataMatch) return { lat: parseFloat(dataMatch[1]), lng: parseFloat(dataMatch[2]) };

  const llMatch = url.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (llMatch) return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) };

  const centerMatch = url.match(/[?&]center=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (centerMatch) return { lat: parseFloat(centerMatch[1]), lng: parseFloat(centerMatch[2]) };

  const pathMatch = url.match(/\/maps\/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (pathMatch) return { lat: parseFloat(pathMatch[1]), lng: parseFloat(pathMatch[2]) };

  const destMatch = url.match(/[?&](?:destination|daddr)=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (destMatch) return { lat: parseFloat(destMatch[1]), lng: parseFloat(destMatch[2]) };

  return null;
}

function extractPlaceNameFromUrl(url: string): string | null {
  const placeMatch = url.match(/\/place\/([^/@]+)/);
  if (placeMatch) return decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));

  const qTextMatch = url.match(/[?&]q=([^&]+)/);
  if (qTextMatch) {
    const val = decodeURIComponent(qTextMatch[1].replace(/\+/g, ' '));
    if (!/^-?\d+\.?\d*,-?\d+\.?\d*$/.test(val)) return val;
  }
  return null;
}

async function getNextSiteNumber(supabase: any): Promise<number> {
  const { data: sites } = await supabase.from('sites').select('name');
  let maxNum = 0;
  if (sites) {
    for (const s of sites) {
      const match = s.name.match(/Site\s+(\d+)/i);
      if (match) {
        const num = parseInt(match[1]);
        if (num > maxNum) maxNum = num;
      }
    }
  }
  return maxNum + 1;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = createServerClient();
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    let lat: number, lng: number, name: string, address: string | null = null;
    let google_maps_url: string | null = null;

    const nextNum = await getNextSiteNumber(supabase);
    const autoName = `Stampede Wash - Site ${nextNum}`;

    if (body.google_maps_url) {
      google_maps_url = body.google_maps_url;
      let url = body.google_maps_url.trim();

      // Resolve short URLs
      if (url.match(/goo\.gl|maps\.app\.goo\.gl/)) {
        try { const resolved = await fetch(url, { redirect: 'follow' }); url = resolved.url; } catch {}
      }

      let coords = extractCoordsFromUrl(url);

      // Try geocoding place name from URL
      if (!coords && apiKey) {
        const placeName = extractPlaceNameFromUrl(url);
        const query = placeName || url;
        try {
          const searchRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`);
          const searchData = await searchRes.json();
          if (searchData.results?.[0]) {
            coords = { lat: searchData.results[0].geometry.location.lat, lng: searchData.results[0].geometry.location.lng };
            address = searchData.results[0].formatted_address;
          }
        } catch {}
      }

      // Last resort: treat as plain address
      if (!coords && apiKey) {
        try {
          const searchRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(body.google_maps_url.trim())}&key=${apiKey}`);
          const searchData = await searchRes.json();
          if (searchData.results?.[0]) {
            coords = { lat: searchData.results[0].geometry.location.lat, lng: searchData.results[0].geometry.location.lng };
            address = searchData.results[0].formatted_address;
          }
        } catch {}
      }

      if (!coords) return NextResponse.json({ error: 'Could not extract location. Try a full Google Maps URL or street address.' }, { status: 400 });

      lat = coords.lat;
      lng = coords.lng;

      if (!address && apiKey) {
        try {
          const geoRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`);
          const geoData = await geoRes.json();
          address = geoData.results?.[0]?.formatted_address || null;
        } catch {}
      }

      name = body.name || autoName;
    } else if (body.lat !== undefined && body.lng !== undefined) {
      lat = body.lat;
      lng = body.lng;
      name = body.name || autoName;

      if (apiKey) {
        try {
          const geoRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`);
          const geoData = await geoRes.json();
          address = geoData.results?.[0]?.formatted_address || null;
        } catch {}
      }
    } else {
      return NextResponse.json({ error: 'Provide a Google Maps link, address, or coordinates' }, { status: 400 });
    }

    const { data: site, error } = await supabase
      .from('sites')
      .insert({ name, address, lat, lng, google_maps_url, status: 'potential', research_status: 'pending' })
      .select()
      .single();

    if (error) throw error;

    // FIX 7: Auto-research (fire and forget)
    const baseUrl = req.nextUrl.origin;
    fetch(`${baseUrl}/api/research/${site.id}`, { method: 'POST' }).catch(() => {});

    return NextResponse.json({ site });
  } catch (err: any) {
    console.error('Add site error:', err);
    return NextResponse.json({ error: err.message || 'Failed to add site' }, { status: 500 });
  }
}
