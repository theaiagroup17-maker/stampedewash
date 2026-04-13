import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = createServerClient();
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    let lat: number, lng: number, name: string, address: string | null = null;
    let google_maps_url: string | null = null;

    if (body.google_maps_url) {
      // Extract coordinates from Google Maps URL
      google_maps_url = body.google_maps_url;
      const url = body.google_maps_url;

      // Try to extract coordinates from URL patterns
      let coords: { lat: number; lng: number } | null = null;

      // Pattern: @lat,lng
      const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (atMatch) {
        coords = { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
      }

      // Pattern: place/.../ or query param
      if (!coords) {
        const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
        if (qMatch) {
          coords = { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
        }
      }

      // If no coords found in URL, try Places API text search
      if (!coords && apiKey) {
        // Extract place name from URL
        const placeMatch = url.match(/place\/([^/@]+)/);
        const query = placeMatch ? decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')) : url;

        const searchRes = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`
        );
        const searchData = await searchRes.json();
        if (searchData.results?.[0]) {
          const loc = searchData.results[0].geometry.location;
          coords = { lat: loc.lat, lng: loc.lng };
          address = searchData.results[0].formatted_address;
        }
      }

      if (!coords) {
        return NextResponse.json({ error: 'Could not extract coordinates from URL' }, { status: 400 });
      }

      lat = coords.lat;
      lng = coords.lng;

      // Reverse geocode for address if we don't have one
      if (!address && apiKey) {
        const geoRes = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
        );
        const geoData = await geoRes.json();
        address = geoData.results?.[0]?.formatted_address || null;
      }

      name = body.name || address || `Site at ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } else if (body.lat !== undefined && body.lng !== undefined) {
      lat = body.lat;
      lng = body.lng;
      name = body.name || `Site at ${lat.toFixed(4)}, ${lng.toFixed(4)}`;

      // Reverse geocode
      if (apiKey) {
        const geoRes = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
        );
        const geoData = await geoRes.json();
        address = geoData.results?.[0]?.formatted_address || null;
      }
    } else {
      return NextResponse.json({ error: 'Provide google_maps_url or lat/lng' }, { status: 400 });
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

    // Fire and forget: trigger research
    const baseUrl = req.nextUrl.origin;
    fetch(`${baseUrl}/api/research/${site.id}`, { method: 'POST' }).catch(() => {});

    return NextResponse.json({ site });
  } catch (err: any) {
    console.error('Add site error:', err);
    return NextResponse.json({ error: err.message || 'Failed to add site' }, { status: 500 });
  }
}
