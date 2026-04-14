import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const { site_id, tag_id } = await req.json();
    if (!site_id || !tag_id) return NextResponse.json({ error: 'site_id and tag_id required' }, { status: 400 });

    const { error } = await supabase.from('site_tags').insert({ site_id, tag_id });
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const { site_id, tag_id } = await req.json();
    if (!site_id || !tag_id) return NextResponse.json({ error: 'site_id and tag_id required' }, { status: 400 });

    const { error } = await supabase.from('site_tags').delete().eq('site_id', site_id).eq('tag_id', tag_id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
