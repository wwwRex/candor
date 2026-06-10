import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getAuthUser } from '../../../../lib/supabase/server';

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { entry_id, content_type }: { entry_id: string; content_type: string } =
    await request.json();

  const extension = content_type.includes('quicktime') ? 'mov' : 'mp4';
  const path = `${user.id}/${entry_id}.${extension}`;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from('videos')
    .createSignedUploadUrl(path, { upsert: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ signed_url: data.signedUrl, path, token: data.token });
}
