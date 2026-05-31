import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getAuthUser } from '../../../../lib/supabase/server';

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { goal_id, entry_id }: { goal_id: string; entry_id: string } = await request.json();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('goal_completions')
    .insert({ goal_id, entry_id, user_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
