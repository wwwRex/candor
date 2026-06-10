import { NextResponse } from 'next/server';
import { getAuthUser } from '../../../../../lib/supabase/server';
import { createSupabaseServerClient } from '../../../../../lib/supabase/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { rating }: { rating: 1 | -1 } = await request.json();

  if (rating !== 1 && rating !== -1) {
    return NextResponse.json({ error: 'Rating must be 1 or -1' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('insight_sessions')
    .update({ rating })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
