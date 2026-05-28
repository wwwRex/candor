import { NextResponse } from 'next/server';
import { supabaseService } from '../../../../lib/supabase/service';

export async function POST(request: Request) {
  if (request.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  // Find all users whose advice is due based on their frequency setting
  const { data: users, error } = await supabaseService.from('users').select(`
    id,
    advice_frequency,
    insight_sessions (generated_at)
  `);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const dueUserIds: string[] = [];

  for (const user of users ?? []) {
    const lastInsight = (user.insight_sessions as { generated_at: string }[] | null)
      ?.sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime())[0];

    let dueAfterMs: number;
    switch (user.advice_frequency) {
      case 'daily':
        dueAfterMs = 24 * 60 * 60 * 1000;
        break;
      case 'every_2_days':
        dueAfterMs = 2 * 24 * 60 * 60 * 1000;
        break;
      default:
        dueAfterMs = 7 * 24 * 60 * 60 * 1000;
    }

    if (
      !lastInsight ||
      now.getTime() - new Date(lastInsight.generated_at).getTime() >= dueAfterMs
    ) {
      dueUserIds.push(user.id);
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  // Generate insights in parallel (max 10 at once)
  const results = await Promise.allSettled(
    dueUserIds.map((userId) =>
      fetch(`${baseUrl}/api/insights/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': process.env.CRON_SECRET!,
        },
        body: JSON.stringify({ user_id: userId }),
      })
    )
  );

  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  return NextResponse.json({ processed: dueUserIds.length, succeeded, failed });
}
