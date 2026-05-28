import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getAuthUser } from '../../../lib/supabase/server';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('insight_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('generated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
