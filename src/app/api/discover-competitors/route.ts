import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerClient } from '@/lib/supabase';

export const maxDuration = 60;

export async function POST(_req: NextRequest) {
  try {
    const supabase = createServerClient();
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 15 }],
      system: 'You are a commercial intelligence agent for the car wash industry in Alberta, Canada. Search the web thoroughly to find every automatic, express, or tunnel car wash currently operating in Calgary, Airdrie, Cochrane, and Okotoks, Alberta. Do not include hand-wash only or detail-only operations unless they also operate an automatic/tunnel wash. Return structured JSON only — no prose, no markdown, no code fences.',
      messages: [
        {
          role: 'user',
          content: `Find all automatic, express, and tunnel car washes operating in Calgary, Airdrie, Cochrane, and Okotoks, Alberta, Canada. Use these normalized brand keys: gww = Great White Wash, mnt = Mint Smartwash, coop = Calgary Co-op, bub = Bubbles Car Wash, mrb = Mr. Bubbles Carwash, ess = Esso, pca = Petro-Canada, shl = Shell, sup = Supersuds, wav = Wave Express Wash, mrx = Mr. Express Car Wash, glo = Glow Auto Wash, ult = Ultra Car Wash, blu = Bluewave Car Wash, ind = Independent (no major brand), oth = Other. Return: { "competitors": [ { "name": "string", "brand": "string", "address": "string", "city": "string", "lat": null, "lng": null, "wash_type": "tunnel|automatic|express|full_service|detail" } ] }`,
        },
      ],
    });

    let responseText = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        responseText += block.text;
      }
    }

    responseText = responseText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      else throw new Error('Could not parse competitor response');
    }

    const competitorsList = parsed.competitors || [];
    let upserted = 0;

    for (const comp of competitorsList) {
      // Geocode if missing coordinates
      if ((!comp.lat || !comp.lng) && comp.address && apiKey) {
        try {
          const geoRes = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(comp.address + ', Alberta, Canada')}&key=${apiKey}`
          );
          const geoData = await geoRes.json();
          if (geoData.results?.[0]) {
            comp.lat = geoData.results[0].geometry.location.lat;
            comp.lng = geoData.results[0].geometry.location.lng;
          }
        } catch {}
      }

      // Upsert by name + address
      const { data: existing } = await supabase
        .from('competitors')
        .select('id')
        .eq('name', comp.name)
        .eq('address', comp.address || '')
        .maybeSingle();

      if (existing) {
        await supabase
          .from('competitors')
          .update({
            brand: comp.brand || 'oth',
            lat: comp.lat,
            lng: comp.lng,
            city: comp.city,
            wash_type: comp.wash_type,
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('competitors').insert({
          name: comp.name,
          brand: comp.brand || 'oth',
          address: comp.address,
          lat: comp.lat,
          lng: comp.lng,
          city: comp.city,
          wash_type: comp.wash_type,
          verified: false,
        });
      }
      upserted++;
    }

    return NextResponse.json({ found: competitorsList.length, upserted });
  } catch (err: any) {
    console.error('Discover competitors error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
