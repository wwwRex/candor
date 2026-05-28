export interface JournalEntry {
  id: string;
  user_id: string;
  video_url: string | null;
  transcript: string | null;
  sentiment_summary: string | null;
  recorded_at: string;
  duration_seconds: number | null;
  created_at: string;
  daily_intentions?: DailyIntention[];
  goal_completions?: GoalCompletion[];
}

export interface CreateJournalEntryDto {
  id: string;
  video_url?: string;
  duration_seconds?: number;
  recorded_at?: string;
}

export interface DailyIntention {
  id: string;
  entry_id: string;
  user_id: string;
  title: string;
  completed: boolean;
  created_at: string;
}

export interface CreateDailyIntentionDto {
  entry_id: string;
  title: string;
}

export interface GoalCompletion {
  id: string;
  goal_id: string;
  entry_id: string;
  user_id: string;
  completed_at: string;
}
