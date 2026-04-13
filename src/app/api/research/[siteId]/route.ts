import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerClient } from '@/lib/supabase';

export const maxDuration = 60;

export async function POST(req: NextRequest, { params }: { params: { siteId: string } }) {
  const supabase = createServerClient();

  try {
    // Fetch site
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

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 10 }],
      system: 'You are a commercial real estate research agent specializing in Calgary, Alberta, Canada. Your job is to gather as much relevant information as possible about a specific property being evaluated as a potential car wash site. Search the web thoroughly. Return structured JSON only — no prose, no markdown, no code fences. Just a valid raw JSON object.',
      messages: [
        {
          role: 'user',
          content: `Research this Calgary-area property for car wash site evaluation. Address: ${site.address || 'Unknown'}. Coordinates: ${site.lat}, ${site.lng}. Return a JSON object with these exact keys (use null for anything you cannot find): { "property_info": { "address": null, "legal_description": null, "lot_size_sqft": null, "zoning_code": null, "zoning_description": null, "parcel_id": null, "municipality": null }, "sale_history": { "most_recent_sale_price": null, "most_recent_sale_date": null, "listing_status": null, "listing_price": null, "mls_number": null, "days_on_market": null }, "traffic": { "estimated_daily_count": null, "major_nearby_roads": null, "highway_access": null, "ingress_egress_notes": null }, "demographics": { "population_1km": null, "population_3km": null, "population_5km": null, "avg_household_income": null, "vehicle_ownership_rate": null, "source_year": null }, "nearby_competitors": [], "news_and_notes": [], "flags_and_concerns": [] }`,
        },
      ],
    });

    // Extract text from response
    let responseText = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        responseText += block.text;
      }
    }

    // Strip markdown code fences if present
    responseText = responseText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    // Parse JSON
    let researchData;
    try {
      researchData = JSON.parse(responseText);
    } catch {
      // Try to find JSON object in the text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        researchData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not parse research response as JSON');
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
