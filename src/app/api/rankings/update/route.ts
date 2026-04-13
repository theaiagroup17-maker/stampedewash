import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { site_id, user_name, rank } = await req.json();

    if (!site_id || !user_name) {
      return NextResponse.json({ error: 'site_id and user_name required' }, { status: 400 });
    }

    if (rank !== null && (rank < 1 || rank > 10)) {
      return NextResponse.json({ error: 'Rank must be 1-10 or null' }, { status: 400 });
    }

    const supabase = createServerClient();

    // If assigning a rank, clear that rank from any other site for this user
    if (rank !== null) {
      // Find existing ranking with this rank for this user
      const { data: existing } = await supabase
        .from('rankings')
        .select('id, site_id')
        .eq('user_name', user_name)
        .eq('rank', rank)
        .neq('site_id', site_id);

      if (existing && existing.length > 0) {
        // Set those to null
        await supabase
          .from('rankings')
          .update({ rank: null, updated_at: new Date().toISOString() })
          .in('id', existing.map(r => r.id));
      }
    }

    // Upsert the ranking
    const { error } = await supabase
      .from('rankings')
      .upsert(
        {
          site_id,
          user_name,
          rank,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'site_id,user_name' }
      );

    if (error) throw error;

    // Return updated rankings for this user
    const { data: userRankings } = await supabase
      .from('rankings')
      .select('*')
      .eq('user_name', user_name)
      .order('rank', { ascending: true });

    return NextResponse.json({ rankings: userRankings });
  } catch (err: any) {
    console.error('Rankings update error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
