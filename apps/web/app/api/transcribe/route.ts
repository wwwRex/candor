import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getAuthUser } from '../../../lib/supabase/server';
import { supabaseService } from '../../../lib/supabase/service';
import { openai } from '../../../lib/openai';
import { anthropic } from '../../../lib/anthropic';

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { entry_id, video_url }: { entry_id: string; video_url: string } = await request.json();

  // Download video from Supabase Storage
  const { data: fileData, error: downloadError } = await supabaseService.storage
    .from('videos')
    .download(video_url);

  if (downloadError || !fileData) {
    return NextResponse.json({ error: 'Failed to download video' }, { status: 500 });
  }

  // Transcribe with Whisper
  const file = new File([fileData], 'audio.mp4', { type: 'audio/mp4' });
  const transcription = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    response_format: 'text',
  });

  const transcript = typeof transcription === 'string' ? transcription : '';

  // Generate a short sentiment summary with Haiku
  let sentiment_summary: string | null = null;
  if (transcript.trim()) {
    const sentimentResponse = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 50,
      messages: [
        {
          role: 'user',
          content: `In 5-10 words, summarize the emotional tone of this journal entry. Be specific and warm. Entry: "${transcript.slice(0, 500)}"`,
        },
      ],
    });
    const block = sentimentResponse.content.find((b) => b.type === 'text');
    if (block && block.type === 'text') sentiment_summary = block.text.trim();
  }

  // Update the journal entry
  const supabase = await createSupabaseServerClient();
  const { error: updateError } = await supabase
    .from('journal_entries')
    .update({ transcript, sentiment_summary })
    .eq('id', entry_id)
    .eq('user_id', user.id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ transcript, sentiment_summary });
}
