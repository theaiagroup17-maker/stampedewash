import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

function extractCoordsFromUrl(url: string): { lat: number; lng: number } | null {
  // Pattern: @lat,lng,zoom or @lat,lng
  const atMatch = url.match(/@(-?\d+\.?\d+),(-?\d+\.?\d+)/);
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };

  // Pattern: !3d<lat>!4d<lng> (Google Maps data params)
  const dataMatch = url.match(/!3d(-?\d+\.?\d+)!4d(-?\d+\.?\d+)/);
  if (dataMatch) return { lat: parseFloat(dataMatch[1]), lng: parseFloat(dataMatch[2]) };

  // Pattern: ?q=lat,lng or &q=lat,lng
  const qMatch = url.match(/[?&]q=(-?\d+\.?\d+),(-?\d+\.?\d+)/);
  if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };

  // Pattern: ?ll=lat,lng
  const llMatch = url.match(/[?&]ll=(-?\d+\.?\d+),(-?\d+\.?\d+)/);
  if (llMatch) return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) };

  // Pattern: ?center=lat,lng
  const centerMatch = url.match(/[?&]center=(-?\d+\.?\d+),(-?\d+\.?\d+)/);
  if (centerMatch) return { lat: parseFloat(centerMatch[1]), lng: parseFloat(centerMatch[2]) };

  // Pattern: /maps/lat,lng
  const pathMatch = url.match(/\/maps\/(-?\d+\.?\d+),(-?\d+\.?\d+)/);
  if (pathMatch) return { lat: parseFloat(pathMatch[1]), lng: parseFloat(pathMatch[2]) };

  // Pattern: destination or daddr params
  const destMatch = url.match(/[?&](?:destination|daddr)=(-?\d+\.?\d+),(-?\d+\.?\d+)/);
  if (destMatch) return { lat: parseFloat(destMatch[1]), lng: parseFloat(destMatch[2]) };

  return null;
}

function extractSearchQueryFromUrl(url: string): string | null {
  // /place/Place+Name+Here/ or /place/Place+Name+Here/@...
  const placeMatch = url.match(/\/place\/([^/@]+)/);
  if (placeMatch) {
    return decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
  }

  // ?q=some+text (non-coordinate text)
  const qMatch = url.match(/[?&]q=([^&]+)/);
  if (qMatch) {
    const val = decodeURIComponent(qMatch[1].replace(/\+/g, ' '));
    if (!/^-?\d+\.?\d*,-?\d+\.?\d*$/.test(val)) return val;
  }

  // /search/query+text/
  const searchMatch = url.match(/\/search\/([^/@]+)/);
  if (searchMatch) {
    return decodeURIComponent(searchMatch[1].replace(/\+/g, ' '));
  }

  return null;
}

async function resolveShortUrl(url: string): Promise<string> {
  try {
    // Use HEAD request with manual redirect to get the Location header
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
    });
    const location = res.headers.get('location');
    if (location) {
      console.log('[add-site] Short URL resolved:', url, '->', location);
      // May need to follow another redirect
      if (location.match(/goo\.gl|maps\.app/)) {
        return resolveShortUrl(location);
      }
      return location;
    }
    // If no redirect, try GET with follow
    const getRes = await fetch(url, { redirect: 'follow' });
    console.log('[add-site] Short URL followed to:', getRes.url);
    return getRes.url;
  } catch (e) {
    console.error('[add-site] Failed to resolve short URL:', url, e);
    return url;
  }
}

async function geocodeAddress(query: string, apiKey: string): Promise<{ lat: number; lng: number; address: string } | null> {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`
    );
    const data = await res.json();
    if (data.status === 'OK' && data.results?.[0]) {
      return {
        lat: data.results[0].geometry.location.lat,
        lng: data.results[0].geometry.location.lng,
        address: data.results[0].formatted_address,
      };
    }
    console.log('[add-site] Geocode returned no results for:', query, 'Status:', data.status);
    return null;
  } catch (e) {
    console.error('[add-site] Geocode error for:', query, e);
    return null;
  }
}

async function reverseGeocode(lat: number, lng: number, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
    );
    const data = await res.json();
    return data.results?.[0]?.formatted_address || null;
  } catch {
    return null;
  }
}

async function getNextSiteNumber(supabase: any): Promise<number> {
  const { data: sites } = await supabase.from('sites').select('name');
  let maxNum = 0;
  if (sites) {
    for (const s of sites) {
      const match = s.name.match(/Site\s+(\d+)/i);
      if (match) maxNum = Math.max(maxNum, parseInt(match[1]));
    }
  }
  return maxNum + 1;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = createServerClient();
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    console.log('[add-site] Request body:', JSON.stringify(body));

    let lat = 0;
    let lng = 0;
    let latResolved = false;
    let name: string;
    let address: string | null = null;
    let google_maps_url: string | null = null;

    const nextNum = await getNextSiteNumber(supabase);
    const autoName = `Stampede Wash - Site ${nextNum}`;

    if (body.google_maps_url) {
      google_maps_url = body.google_maps_url;
      let url = body.google_maps_url.trim();
      console.log('[add-site] Processing URL:', url);

      // Step 1: Resolve short URLs (maps.app.goo.gl, goo.gl/maps)
      if (url.match(/goo\.gl|maps\.app/i)) {
        console.log('[add-site] Resolving short URL...');
        url = await resolveShortUrl(url);
        console.log('[add-site] Resolved to:', url);
      }

      // Step 2: Try to extract coordinates directly from URL
      const coords = extractCoordsFromUrl(url);
      if (coords) {
        console.log('[add-site] Extracted coords from URL:', coords);
        lat = coords.lat;
        lng = coords.lng;
        latResolved = true;
      }

      // Step 3: If no coords, try to extract a search query and geocode it
      if (!latResolved && apiKey) {
        const searchQuery = extractSearchQueryFromUrl(url);
        if (searchQuery) {
          console.log('[add-site] Extracted search query from URL:', searchQuery);
          const result = await geocodeAddress(searchQuery, apiKey);
          if (result) {
            lat = result.lat;
            lng = result.lng;
            address = result.address;
            latResolved = true;
            console.log('[add-site] Geocoded search query:', result);
          }
        }
      }

      // Step 4: Last resort — treat the raw input as a plain address
      if (!latResolved && apiKey) {
        // Clean the input — if it's a URL, don't send the whole URL to geocoder
        const rawInput = body.google_maps_url.trim();
        const isUrl = rawInput.startsWith('http') || rawInput.includes('google.com') || rawInput.includes('goo.gl');

        if (!isUrl) {
          console.log('[add-site] Treating input as plain address:', rawInput);
          const result = await geocodeAddress(rawInput, apiKey);
          if (result) {
            lat = result.lat;
            lng = result.lng;
            address = result.address;
            latResolved = true;
            console.log('[add-site] Geocoded plain address:', result);
          }
        } else {
          console.log('[add-site] Input is a URL but could not extract coords or place name');
        }
      }

      if (!latResolved) {
        console.error('[add-site] Failed to get coordinates. URL:', url);
        return NextResponse.json(
          { error: 'Could not extract location from that input. Try pasting coordinates (e.g. "51.0447, -114.0719") or a street address.' },
          { status: 400 }
        );
      }

      // Reverse geocode for address if we don't have one
      if (!address && apiKey) {
        address = await reverseGeocode(lat, lng, apiKey);
      }

      name = body.name || autoName;
    } else if (body.lat !== undefined && body.lng !== undefined) {
      lat = body.lat;
      lng = body.lng;
      name = body.name || autoName;

      if (apiKey) {
        address = await reverseGeocode(lat, lng, apiKey);
      }
    } else {
      return NextResponse.json({ error: 'Provide a Google Maps link, address, or coordinates' }, { status: 400 });
    }

    console.log('[add-site] Inserting site:', { name, address, lat, lng });

    const { data: site, error } = await supabase
      .from('sites')
      .insert({ name, address, lat, lng, google_maps_url, status: 'potential', research_status: 'pending' })
      .select()
      .single();

    if (error) {
      console.error('[add-site] Supabase insert error:', error);
      throw error;
    }

    console.log('[add-site] Site created:', site.id, site.name);

    // Auto-research (fire and forget)
    const baseUrl = req.nextUrl.origin;
    fetch(`${baseUrl}/api/research/${site.id}`, { method: 'POST' }).catch(() => {});

    return NextResponse.json({ site });
  } catch (err: any) {
    console.error('[add-site] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to add site' }, { status: 500 });
  }
}
