import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerClient } from '@/lib/supabase';

export const maxDuration = 60;

export async function POST(_req: NextRequest) {
  try {
    const supabase = createServerClient();
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const geoKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    console.log('[discover-competitors] Starting AI competitor search...');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      tools: [{ type: 'web_search_20250305' as any, name: 'web_search' }],
      system: `You are a commercial intelligence agent for the car wash industry in Alberta, Canada. Use the web_search tool to find every automatic, express, or tunnel car wash currently operating in Calgary, Airdrie, Cochrane, and Okotoks, Alberta. Do not include hand-wash only or detail-only operations unless they also have an automatic/tunnel wash.

After searching, return ONLY a valid JSON object. No prose, no markdown code fences. Just raw JSON.`,
      messages: [{
        role: 'user',
        content: `Find all automatic, express, and tunnel car washes in Calgary, Airdrie, Cochrane, and Okotoks, Alberta, Canada.

Search for these brands specifically: Great White Wash, Mint Smartwash, Calgary Co-op car wash, Bubbles Car Wash, Petro-Canada car wash, Shell car wash, Esso car wash, Supersuds, Wave Express Wash, Mr. Express Car Wash, Glow Auto Wash, Ultra Car Wash, Bluewave Car Wash, and any independents.

Brand keys: gww=Great White Wash, mnt=Mint Smartwash, coop=Calgary Co-op, bub=Bubbles Car Wash, mrb=Mr. Bubbles Carwash, ess=Esso, pca=Petro-Canada, shl=Shell, sup=Supersuds, wav=Wave Express Wash, mrx=Mr. Express Car Wash, glo=Glow Auto Wash, ult=Ultra Car Wash, blu=Bluewave Car Wash, ind=Independent, oth=Other.

Return: { "competitors": [ { "name": "string", "brand": "brand_key", "address": "full street address", "city": "Calgary|Airdrie|Cochrane|Okotoks", "lat": null, "lng": null, "wash_type": "tunnel|automatic|express|full_service|detail" } ] }`,
      }],
    });

    // Extract text from response
    let responseText = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        responseText += block.text;
      }
    }

    console.log('[discover-competitors] Raw response length:', responseText.length);

    // Strip markdown code fences
    responseText = responseText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        console.error('[discover-competitors] Failed to parse. Raw:', responseText.substring(0, 500));
        throw new Error('Could not parse competitor response as JSON');
      }
    }

    const competitorsList: any[] = parsed.competitors || [];
    console.log('[discover-competitors] Found', competitorsList.length, 'competitors from AI');

    let upserted = 0;
    const validCities = ['Calgary', 'Airdrie', 'Cochrane', 'Okotoks', "Tsuut'ina"];

    for (const comp of competitorsList) {
      // Geocode if missing lat/lng
      if ((!comp.lat || !comp.lng) && comp.address && geoKey) {
        try {
          const geoRes = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(comp.address + ', Alberta, Canada')}&key=${geoKey}`
          );
          const geoData = await geoRes.json();
          if (geoData.results?.[0]) {
            comp.lat = geoData.results[0].geometry.location.lat;
            comp.lng = geoData.results[0].geometry.location.lng;
          }
        } catch (e) {
          console.warn('[discover-competitors] Geocode failed for:', comp.address, e);
        }
      }

      if (!comp.lat || !comp.lng) continue;

      const city = validCities.includes(comp.city) ? comp.city : 'Calgary';
      const brand = comp.brand || 'oth';
      const address = comp.address || '';

      // Upsert by name
      const { data: existing } = await supabase
        .from('competitors')
        .select('id')
        .eq('name', comp.name)
        .maybeSingle();

      if (existing) {
        await supabase.from('competitors')
          .update({ brand, address, lat: comp.lat, lng: comp.lng, city, wash_type: comp.wash_type })
          .eq('id', existing.id);
      } else {
        const { error } = await supabase.from('competitors').insert({
          name: comp.name, brand, address, lat: comp.lat, lng: comp.lng,
          city, wash_type: comp.wash_type, verified: false,
        });
        if (error) console.warn('[discover-competitors] Insert error:', comp.name, error.message);
      }
      upserted++;
    }

    console.log('[discover-competitors] Upserted', upserted, 'competitors');
    return NextResponse.json({ found: competitorsList.length, upserted });
  } catch (err: any) {
    console.error('[discover-competitors] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
