import { NextResponse } from 'next/server';
import { getAuthUser } from '../../../../lib/supabase/server';
import { supabaseService } from '../../../../lib/supabase/service';
import { anthropic, LIFESTYLE_ADVISOR_SYSTEM_PROMPT } from '../../../../lib/anthropic';
import { openai } from '../../../../lib/openai';

async function runAdvicePipeline(userId: string) {
  // Find the last insight to determine the period start
  const { data: lastInsight } = await supabaseService
    .from('insight_sessions')
    .select('period_end')
    .eq('user_id', userId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const periodStart = lastInsight?.period_end
    ? new Date(lastInsight.period_end)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const periodEnd = new Date();

  // Fetch transcripts since last insight
  const { data: entries } = await supabaseService
    .from('journal_entries')
    .select('transcript, recorded_at, sentiment_summary')
    .eq('user_id', userId)
    .gte('recorded_at', periodStart.toISOString())
    .lte('recorded_at', periodEnd.toISOString())
    .not('transcript', 'is', null)
    .order('recorded_at', { ascending: true })
    .limit(20);

  if (!entries || entries.length === 0) return null;

  // Fetch goal completion stats
  const { data: goalStats } = await supabaseService
    .from('goal_completions')
    .select('goals(title), completed_at')
    .eq('user_id', userId)
    .gte('completed_at', periodStart.toISOString());

  const goalCountMap: Record<string, number> = {};
  for (const gc of goalStats ?? []) {
    const title = (gc.goals as unknown as { title: string } | null)?.title;
    if (title) goalCountMap[title] = (goalCountMap[title] ?? 0) + 1;
  }
  const goalSummary = Object.entries(goalCountMap)
    .map(([title, count]) => `${title}: ${count}x`)
    .join(', ');

  const transcriptText = entries
    .map((e) => `[${new Date(e.recorded_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}]: ${e.transcript}`)
    .join('\n\n---\n\n');

  const userPrompt = [
    `Here are my journal entries from ${periodStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} to ${periodEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}:`,
    '',
    transcriptText,
    '',
    goalSummary ? `Goals I completed during this period: ${goalSummary}` : '',
    '',
    'Please provide my personalized lifestyle insight based on what you observe.',
  ]
    .filter(Boolean)
    .join('\n');

  // Generate advice with Claude (prompt caching on system prompt)
  const claudeResponse = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1500,
    system: [
      {
        type: 'text',
        text: LIFESTYLE_ADVISOR_SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userPrompt }],
  });

  const textBlock = claudeResponse.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('No text response from Claude');
  const adviceText = textBlock.text;

  // Insert insight session
  const { data: session, error: insertError } = await supabaseService
    .from('insight_sessions')
    .insert({
      user_id: userId,
      advice_text: adviceText,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      entry_count: entries.length,
    })
    .select()
    .single();

  if (insertError) throw new Error(insertError.message);

  // Generate TTS narration
  try {
    const mp3Response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova',
      input: adviceText,
    });

    const audioBuffer = Buffer.from(await mp3Response.arrayBuffer());
    const audioPath = `${userId}/${session.id}.mp3`;

    await supabaseService.storage.from('audio').upload(audioPath, audioBuffer, {
      contentType: 'audio/mpeg',
      upsert: true,
    });

    await supabaseService
      .from('insight_sessions')
      .update({ audio_url: audioPath })
      .eq('id', session.id);

    session.audio_url = audioPath;
  } catch (ttsError) {
    console.error('TTS generation failed:', ttsError);
    // Non-fatal — insight is still saved without audio
  }

  // Send Expo push notification
  const { data: userRow } = await supabaseService
    .from('users')
    .select('push_token')
    .eq('id', userId)
    .single();

  if (userRow?.push_token) {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: userRow.push_token,
        title: 'Your insight is ready',
        body: 'Tap to hear what your journal reveals about you.',
        data: { insight_session_id: session.id },
      }),
    });
  }

  return session;
}

// Called by mobile (manual generate) or cron
export async function POST(request: Request) {
  // Allow both user-authenticated calls and cron calls with a user_id
  const body = await request.json().catch(() => ({})) as { user_id?: string };

  let userId: string;

  if (body.user_id && request.headers.get('x-cron-secret') === process.env.CRON_SECRET) {
    userId = body.user_id;
  } else {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    userId = user.id;
  }

  try {
    const session = await runAdvicePipeline(userId);
    if (!session) return NextResponse.json({ message: 'No new entries to analyze' }, { status: 200 });
    return NextResponse.json(session, { status: 201 });
  } catch (err) {
    console.error('Insight generation error:', err);
    return NextResponse.json({ error: 'Insight generation failed' }, { status: 500 });
  }
}
