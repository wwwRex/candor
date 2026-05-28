export interface InsightSession {
  id: string;
  user_id: string;
  advice_text: string;
  audio_url: string | null;
  generated_at: string;
  period_start: string;
  period_end: string;
  entry_count: number;
}
