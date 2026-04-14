import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export const maxDuration = 60;

interface SeedCompetitor {
  name: string;
  brand: string;
  address: string;
  lat: number;
  lng: number;
  city: string;
  wash_type: string;
}

const SEED_COMPETITORS: SeedCompetitor[] = [
  // --- GREAT WHITE WASH (gww) ---
  { name: 'Great White Car Wash - Dufferin', brand: 'gww', address: '5421 Dufferin Blvd SE, Calgary, AB T2C 4Y2', lat: 50.9947, lng: -114.0089, city: 'Calgary', wash_type: 'tunnel' },
  { name: 'Great White Car Wash - Aviation', brand: 'gww', address: '477 Aviation Rd NE, Calgary, AB T2E 7H8', lat: 51.0893, lng: -114.0076, city: 'Calgary', wash_type: 'tunnel' },
  { name: 'Great White Car Wash - Mahogany', brand: 'gww', address: '125 Mahogany St SE, Calgary, AB T3M 0T2', lat: 50.9113, lng: -113.9689, city: 'Calgary', wash_type: 'tunnel' },
  { name: 'Great White Car Wash - Buffalo Run', brand: 'gww', address: "11501 Buffalo Run Blvd #403, Tsuut'ina, AB T3T 0E4", lat: 50.9441, lng: -114.1856, city: 'Calgary', wash_type: 'tunnel' },
  { name: 'Great White Car Wash - Sierra Springs', brand: 'gww', address: '2725 Main St S, Airdrie, AB T4B 3G6', lat: 51.2641, lng: -114.0219, city: 'Airdrie', wash_type: 'tunnel' },
  // --- MINT SMARTWASH (mnt) ---
  { name: 'Mint Smartwash Calgary', brand: 'mnt', address: '150 99 Ave SE, Calgary, AB T2J 5C7', lat: 50.9680, lng: -114.0656, city: 'Calgary', wash_type: 'express' },
  // --- CALGARY CO-OP (coop) ---
  { name: 'Calgary Co-op Car Wash - Mission', brand: 'coop', address: '3623 Macleod Trail SW, Calgary, AB T2G 2H1', lat: 51.0247, lng: -114.0691, city: 'Calgary', wash_type: 'automatic' },
  { name: 'Calgary Co-op Car Wash - Copperfield', brand: 'coop', address: '15566 McIvor Blvd SE, Calgary, AB T2Z 4Y2', lat: 50.9067, lng: -113.9401, city: 'Calgary', wash_type: 'automatic' },
  { name: 'Calgary Co-op Car Wash - Heritage Towne', brand: 'coop', address: '6 Heritage Gate SE, Calgary, AB T2H 3A7', lat: 50.9698, lng: -114.0891, city: 'Calgary', wash_type: 'automatic' },
  { name: 'Calgary Co-op Car Wash - Centre Street', brand: 'coop', address: '8220 Centre Street NE, Calgary, AB T3K 1J7', lat: 51.1167, lng: -114.0600, city: 'Calgary', wash_type: 'automatic' },
  { name: 'Calgary Co-op Car Wash - Canyon Meadows', brand: 'coop', address: '1221 Canyon Meadows Dr SE, Calgary, AB T2J 6G2', lat: 50.9334, lng: -114.0691, city: 'Calgary', wash_type: 'automatic' },
  { name: 'Calgary Co-op Car Wash - 50th Ave SE', brand: 'coop', address: '5250 50 Ave SE, Calgary, AB T2B 3T1', lat: 51.0234, lng: -114.0001, city: 'Calgary', wash_type: 'automatic' },
  { name: 'Calgary Co-op Car Wash - Symons Valley', brand: 'coop', address: '12000 Symons Valley Rd NW, Calgary, AB T3P 0A3', lat: 51.1734, lng: -114.1234, city: 'Calgary', wash_type: 'automatic' },
  { name: 'Calgary Co-op Car Wash - Crowfoot', brand: 'coop', address: '35 Crowfoot Way NW, Calgary, AB T3G 2L4', lat: 51.1067, lng: -114.2034, city: 'Calgary', wash_type: 'automatic' },
  { name: 'Calgary Co-op Car Wash - Shaganappi', brand: 'coop', address: '5505 Shaganappi Trail NW, Calgary, AB T3A 1Z6', lat: 51.0834, lng: -114.1834, city: 'Calgary', wash_type: 'automatic' },
  { name: 'Calgary Co-op Car Wash - Panorama Hills', brand: 'coop', address: '1111 Panatella Blvd NW, Calgary, AB T3K 0B8', lat: 51.1501, lng: -114.1301, city: 'Calgary', wash_type: 'automatic' },
  { name: 'Calgary Co-op Car Wash - Okotoks', brand: 'coop', address: '31 Southridge Dr, Okotoks, AB T1S 2N3', lat: 50.7234, lng: -113.9834, city: 'Okotoks', wash_type: 'automatic' },
  // --- BUBBLES CAR WASH (bub) ---
  { name: 'Bubbles Car Wash - Albert', brand: 'bub', address: '4715 Macleod Trail SW, Calgary, AB T2G 5C1', lat: 51.0001, lng: -114.0701, city: 'Calgary', wash_type: 'full_service' },
  { name: 'Bubbles Car Wash - Stanley Park', brand: 'bub', address: '5912 Macleod Trail SW, Calgary, AB T2H 0K1', lat: 50.9834, lng: -114.0734, city: 'Calgary', wash_type: 'full_service' },
  // --- DREAMS ECO XPRESS (drm) ---
  { name: 'Dreams Eco Xpress Car Wash - NE Calgary', brand: 'drm', address: '3008 23 St NE, Calgary, AB T2E 8R7', lat: 51.0667, lng: -114.0234, city: 'Calgary', wash_type: 'tunnel' },
  { name: 'Dreams Eco Xpress Car Wash - SE Calgary', brand: 'drm', address: '5280 28 Ave SE, Calgary, AB T2B 3W2', lat: 51.0167, lng: -113.9834, city: 'Calgary', wash_type: 'tunnel' },
  { name: 'Dreams Eco Xpress Car Wash - Okotoks', brand: 'drm', address: '78 Fisher Place, Okotoks, AB', lat: 50.7267, lng: -113.9901, city: 'Okotoks', wash_type: 'tunnel' },
  // --- TOP GEAR CAR WASH (tpg) ---
  { name: 'Top Gear Car Wash', brand: 'tpg', address: '1796 120 Ave NE, Calgary, AB T3K 2G3', lat: 51.1334, lng: -114.0434, city: 'Calgary', wash_type: 'automatic' },
  // --- THE WASH KING (wsk) ---
  { name: 'The Wash King', brand: 'wsk', address: '777 Heritage Drive SE, Calgary, AB T2H 2S8', lat: 50.9701, lng: -114.0867, city: 'Calgary', wash_type: 'tunnel' },
  // --- HAPPY BAYS (hpy) ---
  { name: 'Happy Bays Car Wash', brand: 'hpy', address: '4634 16 Ave NW, Calgary, AB T3B 0M8', lat: 51.0634, lng: -114.1834, city: 'Calgary', wash_type: 'automatic' },
  // --- WESTERN CAR CLEANING (wst) ---
  { name: 'Western Car Cleaning', brand: 'wst', address: '4011 Richmond Road SW, Calgary, AB T3E 4P2', lat: 51.0401, lng: -114.1534, city: 'Calgary', wash_type: 'automatic' },
  // --- CAR WASH CORRAL (cwc) ---
  { name: 'Car Wash Corral', brand: 'cwc', address: '102 River Ave, Cochrane, AB T4C 2C3', lat: 51.1901, lng: -114.4667, city: 'Cochrane', wash_type: 'automatic' },
  // --- SAM'S CAR & TRUCK WASH (sms) ---
  { name: "Sam's Car & Truck Wash", brand: 'sms', address: '26 Griffin Industrial Point, Cochrane, AB', lat: 51.1801, lng: -114.4734, city: 'Cochrane', wash_type: 'automatic' },
  // --- SPARKLING AUTO WASH (spk) ---
  { name: 'Sparkling Auto Wash', brand: 'spk', address: '204 Edmonton Trail, Airdrie, AB T4B 1R9', lat: 51.2901, lng: -114.0234, city: 'Airdrie', wash_type: 'automatic' },
  // --- 1/4 MILE CAR WASH (qml) ---
  { name: '1/4 Mile Car Wash', brand: 'qml', address: 'Okotoks, AB', lat: 50.7234, lng: -113.9801, city: 'Okotoks', wash_type: 'tunnel' },
  // --- GATEWAY CAR & TRUCK WASH (gtw) ---
  { name: 'Gateway Car & Truck Wash', brand: 'gtw', address: '36 Gateway Drive NE, Airdrie, AB T4B 0J6', lat: 51.2834, lng: -114.0134, city: 'Airdrie', wash_type: 'automatic' },
  // --- FIRST STREET CAR WASH (fsc) ---
  { name: 'First Street Car Wash - Airdrie', brand: 'fsc', address: 'Airdrie, AB', lat: 51.2967, lng: -114.0134, city: 'Airdrie', wash_type: 'automatic' },
];

async function seedCompetitors() {
  console.log('[seed-competitors] Starting competitor seed...');
  console.log('[seed-competitors] Using SERVICE ROLE client');

  const supabase = createServerClient();
  const geoKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  console.log(`[seed-competitors] Inserting batch of ${SEED_COMPETITORS.length} competitors...`);

  let inserted = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const comp of SEED_COMPETITORS) {
    let { lat, lng } = comp;

    // Geocode for more precise coords (skip city-only addresses)
    if (geoKey && comp.address && !comp.address.match(/^[A-Za-z]+, AB$/)) {
      try {
        const geoRes = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(comp.address)}&key=${geoKey}`
        );
        const geoData = await geoRes.json();
        if (geoData.results?.[0]) {
          lat = geoData.results[0].geometry.location.lat;
          lng = geoData.results[0].geometry.location.lng;
        }
      } catch {
        console.log(`[seed-competitors] Geocode skipped for: ${comp.name}`);
      }
    }

    // Check if exists by name
    const { data: existing, error: lookupErr } = await supabase
      .from('competitors')
      .select('id')
      .eq('name', comp.name)
      .maybeSingle();

    if (lookupErr) {
      console.error(`[seed-competitors] Lookup error for ${comp.name}:`, lookupErr.message);
      errors.push(`${comp.name}: lookup - ${lookupErr.message}`);
      continue;
    }

    if (existing) {
      const { error: updateErr } = await supabase.from('competitors')
        .update({ brand: comp.brand, address: comp.address, city: comp.city, lat, lng, wash_type: comp.wash_type, verified: true })
        .eq('id', existing.id);

      if (updateErr) {
        console.error(`[seed-competitors] Error updating ${comp.name}:`, updateErr.message);
        errors.push(`${comp.name}: update - ${updateErr.message}`);
      } else {
        console.log(`[seed-competitors] Updated: ${comp.name}`);
        updated++;
      }
    } else {
      const { error: insertErr } = await supabase.from('competitors').insert({
        name: comp.name, brand: comp.brand, address: comp.address, city: comp.city,
        lat, lng, wash_type: comp.wash_type, verified: true,
      });

      if (insertErr) {
        console.error(`[seed-competitors] Error inserting ${comp.name}:`, insertErr.message);
        errors.push(`${comp.name}: insert - ${insertErr.message}`);
      } else {
        console.log(`[seed-competitors] Inserted: ${comp.name}`);
        inserted++;
      }
    }
  }

  const total = inserted + updated;
  console.log(`[seed-competitors] Seed complete. Inserted: ${inserted}, Updated: ${updated}, Errors: ${errors.length}, Total: ${total}`);

  return { count: total, inserted, updated, errors, total_in_list: SEED_COMPETITORS.length };
}

export async function POST() {
  try {
    const result = await seedCompetitors();
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[seed-competitors] Fatal error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const result = await seedCompetitors();
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[seed-competitors] Fatal error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
