import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerClient } from '@/lib/supabase';

export const maxDuration = 60;

export async function POST(_req: NextRequest, { params }: { params: { siteId: string } }) {
  const supabase = createServerClient();

  try {
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('*')
      .eq('id', params.siteId)
      .single();

    if (siteError || !site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    // Set status to running
    await supabase
      .from('sites')
      .update({ research_status: 'running', research_data: null })
      .eq('id', params.siteId);

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // web_search is a server-side connector tool — Anthropic handles the search
    // internally and returns results inline. Single API call is all we need.
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      tools: [
        {
          type: 'web_search_20250305' as any,
          name: 'web_search',
          max_uses: 10,
        },
      ],
      system: `You are a commercial real estate research agent specializing in Calgary, Alberta, Canada. Your job is to gather as much relevant information as possible about a specific property being evaluated as a potential car wash site.

Use the web_search tool to search for information about this property and the surrounding area. Search multiple times for different aspects (property records, zoning, traffic, demographics, nearby businesses, news).

After completing your research, return ONLY a valid JSON object. No prose before or after. No markdown code fences. Just the raw JSON object.`,
      messages: [
        {
          role: 'user',
          content: `Research this Calgary-area property for car wash site evaluation.

Address: ${site.address || 'Unknown'}
Coordinates: ${site.lat}, ${site.lng}

Search for: property details, zoning info, sale history, traffic data, demographics, nearby car washes, and any news or concerns about this location.

Return a JSON object with these exact keys (use null for anything you cannot find):
{
  "property_info": { "address": null, "legal_description": null, "lot_size_sqft": null, "zoning_code": null, "zoning_description": null, "parcel_id": null, "municipality": null },
  "sale_history": { "most_recent_sale_price": null, "most_recent_sale_date": null, "listing_status": null, "listing_price": null, "mls_number": null, "days_on_market": null },
  "traffic": { "estimated_daily_count": null, "major_nearby_roads": null, "highway_access": null, "ingress_egress_notes": null },
  "demographics": { "population_1km": null, "population_3km": null, "population_5km": null, "avg_household_income": null, "vehicle_ownership_rate": null, "source_year": null },
  "nearby_competitors": [{ "name": null, "distance_km": null, "type": null, "brand": null, "address": null }],
  "news_and_notes": [{ "headline": null, "date": null, "summary": null, "url": null }],
  "flags_and_concerns": ["string"]
}`,
        },
      ],
    });

    // Extract all text blocks from the response (web_search results are handled server-side)
    let finalText = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        finalText += block.text;
      }
    }

    // Strip markdown code fences if present
    finalText = finalText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    // Parse JSON
    let researchData;
    try {
      researchData = JSON.parse(finalText);
    } catch {
      // Try to find JSON object in the text
      const jsonMatch = finalText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        researchData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not parse research response as JSON. Raw response: ' + finalText.substring(0, 300));
      }
    }

    // Save results
    await supabase
      .from('sites')
      .update({
        research_data: researchData,
        research_status: 'complete',
        last_researched_at: new Date().toISOString(),
      })
      .eq('id', params.siteId);

    return NextResponse.json({ success: true, research_data: researchData });
  } catch (err: any) {
    console.error('Research error:', err);

    await supabase
      .from('sites')
      .update({ research_status: 'failed' })
      .eq('id', params.siteId);

    return NextResponse.json({ error: err.message || 'Research failed' }, { status: 500 });
  }
}
