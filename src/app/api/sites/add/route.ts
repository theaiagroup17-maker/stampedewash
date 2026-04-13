import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

function extractCoordsFromUrl(url: string): { lat: number; lng: number } | null {
  // Pattern 1: @lat,lng (most common in browser URLs)
  const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };

  // Pattern 2: ?q=lat,lng or &q=lat,lng
  const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };

  // Pattern 3: !3d<lat>!4d<lng> (data params in Google Maps URLs)
  const dataMatch = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
  if (dataMatch) return { lat: parseFloat(dataMatch[1]), lng: parseFloat(dataMatch[2]) };

  // Pattern 4: ll=lat,lng
  const llMatch = url.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (llMatch) return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) };

  // Pattern 5: center=lat,lng
  const centerMatch = url.match(/[?&]center=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (centerMatch) return { lat: parseFloat(centerMatch[1]), lng: parseFloat(centerMatch[2]) };

  // Pattern 6: /maps/lat,lng (simple path format)
  const pathMatch = url.match(/\/maps\/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (pathMatch) return { lat: parseFloat(pathMatch[1]), lng: parseFloat(pathMatch[2]) };

  // Pattern 7: destination or daddr params
  const destMatch = url.match(/[?&](?:destination|daddr)=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (destMatch) return { lat: parseFloat(destMatch[1]), lng: parseFloat(destMatch[2]) };

  return null;
}

function extractPlaceNameFromUrl(url: string): string | null {
  // /place/Place+Name/ or /place/Place+Name/@...
  const placeMatch = url.match(/\/place\/([^/@]+)/);
  if (placeMatch) return decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));

  // ?q=some+address (non-coordinate)
  const qTextMatch = url.match(/[?&]q=([^&]+)/);
  if (qTextMatch) {
    const val = decodeURIComponent(qTextMatch[1].replace(/\+/g, ' '));
    // Only return if it's not coordinates
    if (!/^-?\d+\.?\d*,-?\d+\.?\d*$/.test(val)) return val;
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = createServerClient();
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    let lat: number, lng: number, name: string, address: string | null = null;
    let google_maps_url: string | null = null;

    if (body.google_maps_url) {
      google_maps_url = body.google_maps_url;
      let url = body.google_maps_url.trim();

      // If it's a short URL (goo.gl, maps.app.goo.gl), resolve it first
      if (url.match(/goo\.gl|maps\.app\.goo\.gl/)) {
        try {
          const resolved = await fetch(url, { redirect: 'follow' });
          url = resolved.url;
        } catch {}
      }

      // Try to extract coordinates directly from URL
      let coords = extractCoordsFromUrl(url);

      // If no coords, try geocoding the place name from URL
      if (!coords && apiKey) {
        const placeName = extractPlaceNameFromUrl(url);
        const query = placeName || url;

        try {
          const searchRes = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`
          );
          const searchData = await searchRes.json();
          if (searchData.results?.[0]) {
            const loc = searchData.results[0].geometry.location;
            coords = { lat: loc.lat, lng: loc.lng };
            address = searchData.results[0].formatted_address;
          }
        } catch {}
      }

      // Last resort: try the raw input as a plain address/search query
      if (!coords && apiKey) {
        try {
          const searchRes = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(body.google_maps_url.trim())}&key=${apiKey}`
          );
          const searchData = await searchRes.json();
          if (searchData.results?.[0]) {
            const loc = searchData.results[0].geometry.location;
            coords = { lat: loc.lat, lng: loc.lng };
            address = searchData.results[0].formatted_address;
          }
        } catch {}
      }

      if (!coords) {
        return NextResponse.json(
          { error: 'Could not extract location from that link. Try pasting the full Google Maps URL or a street address.' },
          { status: 400 }
        );
      }

      lat = coords.lat;
      lng = coords.lng;

      // Reverse geocode for address if we don't have one yet
      if (!address && apiKey) {
        try {
          const geoRes = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
          );
          const geoData = await geoRes.json();
          address = geoData.results?.[0]?.formatted_address || null;
        } catch {}
      }

      name = body.name || address || `Site at ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } else if (body.lat !== undefined && body.lng !== undefined) {
      lat = body.lat;
      lng = body.lng;
      name = body.name || `Site at ${lat.toFixed(4)}, ${lng.toFixed(4)}`;

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
    } else {
      return NextResponse.json({ error: 'Provide a Google Maps link, address, or coordinates' }, { status: 400 });
    }

    const { data: site, error } = await supabase
      .from('sites')
      .insert({
        name,
        address,
        lat,
        lng,
        google_maps_url,
        status: 'potential',
        research_status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ site });
  } catch (err: any) {
    console.error('Add site error:', err);
    return NextResponse.json({ error: err.message || 'Failed to add site' }, { status: 500 });
  }
}
