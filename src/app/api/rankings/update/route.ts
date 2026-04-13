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
    const now = new Date().toISOString();

    // Get this user's current rank for this site (before changing)
    const { data: currentRanking } = await supabase
      .from('rankings')
      .select('rank')
      .eq('site_id', site_id)
      .eq('user_name', user_name)
      .maybeSingle();

    const oldRank = currentRanking?.rank ?? null;

    if (rank !== null && rank !== oldRank) {
      // Get all of this user's rankings, sorted by rank
      const { data: allRankings } = await supabase
        .from('rankings')
        .select('id, site_id, rank')
        .eq('user_name', user_name)
        .not('rank', 'is', null)
        .neq('site_id', site_id)
        .order('rank', { ascending: true });

      if (allRankings && allRankings.length > 0) {
        // Shift down: any rank >= the new rank gets pushed down by 1
        // But first remove the old rank from the list (we're moving this site)
        const toShift = allRankings.filter(r => r.rank! >= rank);

        for (const r of toShift) {
          const newRankVal = r.rank! + 1;
          // Cap at 10, anything beyond 10 becomes unranked
          if (newRankVal > 10) {
            await supabase
              .from('rankings')
              .update({ rank: null, updated_at: now })
              .eq('id', r.id);
          } else {
            await supabase
              .from('rankings')
              .update({ rank: newRankVal, updated_at: now })
              .eq('id', r.id);
          }
        }
      }
    }

    // Upsert the ranking for this site
    const { error } = await supabase
      .from('rankings')
      .upsert(
        {
          site_id,
          user_name,
          rank,
          updated_at: now,
        },
        { onConflict: 'site_id,user_name' }
      );

    if (error) throw error;

    // Return updated rankings for this user
    const { data: userRankings } = await supabase
      .from('rankings')
      .select('*')
      .eq('user_name', user_name)
      .not('rank', 'is', null)
      .order('rank', { ascending: true, nullsFirst: false });

    return NextResponse.json({ rankings: userRankings });
  } catch (err: any) {
    console.error('Rankings update error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
