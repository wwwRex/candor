import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getAuthUser } from '../../../lib/supabase/server';
import type { CreateJournalEntryDto } from '@repo/shared';

export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const pageSize = 20;
  const from = (page - 1) * pageSize;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*, daily_intentions(*), goal_completions(*, goals(title))')
    .eq('user_id', user.id)
    .order('recorded_at', { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: CreateJournalEntryDto = await request.json();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('journal_entries')
    .insert({
      id: body.id,
      user_id: user.id,
      video_url: body.video_url,
      thumbnail_url: (body as unknown as { thumbnail_url?: string }).thumbnail_url ?? null,
      duration_seconds: body.duration_seconds,
      recorded_at: body.recorded_at ?? new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
