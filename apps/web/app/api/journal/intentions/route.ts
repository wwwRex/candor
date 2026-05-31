import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getAuthUser } from '../../../../lib/supabase/server';
import type { CreateDailyIntentionDto } from '@repo/shared';

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: CreateDailyIntentionDto = await request.json();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('daily_intentions')
    .insert({ entry_id: body.entry_id, user_id: user.id, title: body.title })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
