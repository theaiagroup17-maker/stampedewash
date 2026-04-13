import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export const maxDuration = 60;

interface SeedCompetitor {
  name: string;
  brand: string;
  address: string;
  city: string;
  lat: number | null;
  lng: number | null;
  wash_type: string;
}

const SEED_COMPETITORS: SeedCompetitor[] = [
  // Great White Wash
  { name: 'Great White Wash - Dufferin', brand: 'gww', address: '5421 Dufferin Blvd SE, Calgary', city: 'Calgary', lat: 50.9947, lng: -114.0089, wash_type: 'tunnel' },
  { name: 'Great White Wash - Aviation', brand: 'gww', address: '477 Aviation Rd NE, Calgary', city: 'Calgary', lat: 51.0893, lng: -114.0076, wash_type: 'tunnel' },
  { name: 'Great White Wash - Mahogany', brand: 'gww', address: '125 Mahogany St SE, Calgary', city: 'Calgary', lat: 50.9113, lng: -113.9689, wash_type: 'tunnel' },
  { name: "Great White Wash - Tsuut'ina", brand: 'gww', address: "11501 Buffalo Run Blvd #403, Tsuut'ina", city: 'Calgary', lat: 50.9441, lng: -114.1856, wash_type: 'tunnel' },

  // Mint Smartwash
  { name: 'Mint Smartwash - 99th Ave', brand: 'mnt', address: '150 99th Ave SE, Calgary', city: 'Calgary', lat: 50.9680, lng: -114.0656, wash_type: 'express' },

  // Calgary Co-op
  { name: 'Calgary Co-op Car Wash - Mission', brand: 'coop', address: '3623 Macleod Trail SW, Calgary', city: 'Calgary', lat: 51.0326, lng: -114.0695, wash_type: 'automatic' },
  { name: 'Calgary Co-op Car Wash - Copperfield', brand: 'coop', address: '15566 McIvor Blvd SE #400, Calgary', city: 'Calgary', lat: 50.8986, lng: -113.9631, wash_type: 'automatic' },
  { name: 'Calgary Co-op Car Wash - Heritage Towne', brand: 'coop', address: '6 Heritage Gate SE, Calgary', city: 'Calgary', lat: 50.9838, lng: -114.0582, wash_type: 'automatic' },
  { name: 'Calgary Co-op Car Wash - Centre St', brand: 'coop', address: '8220 Centre Street NE, Calgary', city: 'Calgary', lat: 51.1022, lng: -114.0622, wash_type: 'automatic' },
  { name: 'Calgary Co-op Car Wash - Canyon Meadows', brand: 'coop', address: '1221 Canyon Meadows Dr SE #95, Calgary', city: 'Calgary', lat: 50.9633, lng: -114.0626, wash_type: 'automatic' },
  { name: 'Calgary Co-op Car Wash - 50th Ave', brand: 'coop', address: '5250 50th Ave SE, Calgary', city: 'Calgary', lat: 50.9948, lng: -114.0152, wash_type: 'automatic' },
  { name: 'Calgary Co-op Car Wash - Symons Valley', brand: 'coop', address: '12000 Symons Valley Rd NW, Calgary', city: 'Calgary', lat: 51.1525, lng: -114.1440, wash_type: 'automatic' },
  { name: 'Calgary Co-op Car Wash - Crowfoot', brand: 'coop', address: '35 Crowfoot Way NW, Calgary', city: 'Calgary', lat: 51.1228, lng: -114.1654, wash_type: 'automatic' },
  { name: 'Calgary Co-op Car Wash - Shaganappi', brand: 'coop', address: '5505 Shaganappi Tr NW, Calgary', city: 'Calgary', lat: 51.0651, lng: -114.1335, wash_type: 'automatic' },
  { name: 'Calgary Co-op Car Wash - Panorama Hills', brand: 'coop', address: '1111 Panatella Blvd NW, Calgary', city: 'Calgary', lat: 51.1497, lng: -114.0786, wash_type: 'automatic' },
  { name: 'Calgary Co-op Car Wash - Okotoks', brand: 'coop', address: '31 Southridge Dr #111, Okotoks', city: 'Okotoks', lat: 50.7267, lng: -113.9797, wash_type: 'automatic' },

  // Bubbles Car Wash
  { name: 'Bubbles Car Wash - Macleod S', brand: 'bub', address: '4715 Macleod Trail SW, Calgary', city: 'Calgary', lat: 51.0131, lng: -114.0680, wash_type: 'full_service' },
  { name: 'Bubbles Car Wash - Macleod 59th', brand: 'bub', address: '5912 Macleod Trail SW, Calgary', city: 'Calgary', lat: 50.9987, lng: -114.0666, wash_type: 'full_service' },
];

export async function POST(_req: NextRequest) {
  try {
    const supabase = createServerClient();
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    let count = 0;
    for (const comp of SEED_COMPETITORS) {
      let { lat, lng } = comp;

      // Geocode if still missing coordinates
      if ((lat === null || lng === null) && apiKey) {
        try {
          const geoRes = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(comp.address + ', Alberta, Canada')}&key=${apiKey}`
          );
          const geoData = await geoRes.json();
          if (geoData.results?.[0]) {
            lat = geoData.results[0].geometry.location.lat;
            lng = geoData.results[0].geometry.location.lng;
          }
        } catch {}
      }

      // Skip if we still have no coordinates
      if (lat === null || lng === null) continue;

      // Check if this competitor already exists (by name)
      const { data: existing } = await supabase
        .from('competitors')
        .select('id')
        .eq('name', comp.name)
        .maybeSingle();

      if (existing) {
        // Update existing
        await supabase
          .from('competitors')
          .update({
            brand: comp.brand,
            address: comp.address,
            city: comp.city,
            lat,
            lng,
            wash_type: comp.wash_type,
            verified: true,
          })
          .eq('id', existing.id);
      } else {
        // Insert new
        await supabase.from('competitors').insert({
          name: comp.name,
          brand: comp.brand,
          address: comp.address,
          city: comp.city,
          lat,
          lng,
          wash_type: comp.wash_type,
          verified: true,
        });
      }
      count++;
    }

    return NextResponse.json({ count, message: `Seeded ${count} competitor locations` });
  } catch (err: any) {
    console.error('Seed competitors error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
