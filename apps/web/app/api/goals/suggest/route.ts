import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getAuthUser } from '../../../../lib/supabase/server';
import { anthropic } from '../../../../lib/anthropic';
import type { SuggestedGoal } from '@repo/shared';

export async function POST() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createSupabaseServerClient();

  // Fetch recent transcripts
  const { data: entries } = await supabase
    .from('journal_entries')
    .select('transcript, recorded_at')
    .eq('user_id', user.id)
    .not('transcript', 'is', null)
    .order('recorded_at', { ascending: false })
    .limit(10);

  // Fetch existing goal titles so AI doesn't duplicate
  const { data: existingGoals } = await supabase
    .from('goals')
    .select('title')
    .eq('user_id', user.id)
    .eq('is_active', true);

  const transcriptText = (entries ?? [])
    .map((e) => e.transcript)
    .filter(Boolean)
    .join('\n\n---\n\n');

  const existingTitles = (existingGoals ?? []).map((g) => g.title).join(', ');

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [
      {
        role: 'user',
        content: `Based on these journal entries, suggest exactly 3 specific, actionable lifestyle goals that would genuinely help this person. Do NOT suggest goals they already have: ${existingTitles || 'none yet'}.

Journal entries:
${transcriptText || 'No entries yet.'}

Respond with valid JSON only — an array of 3 objects with "title" (short, under 8 words) and "rationale" (1 sentence, reference something they actually said). No markdown, no extra text.`,
      },
    ],
  });

  const block = response.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') {
    return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
  }

  let suggestions: SuggestedGoal[] = [];
  try {
    suggestions = JSON.parse(block.text) as SuggestedGoal[];
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
  }

  return NextResponse.json(suggestions);
}
