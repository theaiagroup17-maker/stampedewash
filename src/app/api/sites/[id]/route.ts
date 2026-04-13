import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerClient();
    const { data: site, error } = await supabase
      .from('sites')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    const { data: rankings } = await supabase
      .from('rankings')
      .select('*')
      .eq('site_id', params.id);

    return NextResponse.json({ site, rankings: rankings || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerClient();
    const body = await req.json();

    const allowedFields = ['name', 'address', 'status', 'notes', 'google_maps_url'];
    const updates: Record<string, any> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    const { data: site, error } = await supabase
      .from('sites')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ site });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
