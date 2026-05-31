import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getAuthUser } from '../../../lib/supabase/server';
import type { CreateGoalDto } from '@repo/shared';

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: CreateGoalDto = await request.json();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('goals')
    .insert({ user_id: user.id, title: body.title, description: body.description, source: body.source ?? 'user' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
