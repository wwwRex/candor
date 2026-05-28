import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getAuthUser } from '../../../../../lib/supabase/server';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { completed }: { completed: boolean } = await request.json();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('daily_intentions')
    .update({ completed })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
