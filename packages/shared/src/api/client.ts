import type {
  JournalEntry,
  CreateJournalEntryDto,
  DailyIntention,
  CreateDailyIntentionDto,
  GoalCompletion,
  Goal,
  CreateGoalDto,
  UpdateGoalDto,
  SuggestedGoal,
  InsightSession,
  User,
  UpdateUserDto,
} from '../types/index.js';

export class CandorApiClient {
  private baseUrl: string;
  private getToken: () => Promise<string | null>;

  constructor(baseUrl: string, getToken: () => Promise<string | null>) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.getToken = getToken;
  }

  private async fetch<T>(path: string, init?: RequestInit): Promise<T> {
    const token = await this.getToken();
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((err as { error: string }).error ?? res.statusText);
    }
    return res.json() as Promise<T>;
  }

  // Journal
  getJournalEntries(page = 1): Promise<JournalEntry[]> {
    return this.fetch<JournalEntry[]>(`/api/journal?page=${page}`);
  }
  getJournalEntry(id: string): Promise<JournalEntry> {
    return this.fetch<JournalEntry>(`/api/journal/${id}`);
  }
  createJournalEntry(dto: CreateJournalEntryDto): Promise<JournalEntry> {
    return this.fetch<JournalEntry>('/api/journal', { method: 'POST', body: JSON.stringify(dto) });
  }

  // Intentions
  createDailyIntention(dto: CreateDailyIntentionDto): Promise<DailyIntention> {
    return this.fetch<DailyIntention>('/api/journal/intentions', { method: 'POST', body: JSON.stringify(dto) });
  }
  updateIntentionCompleted(id: string, completed: boolean): Promise<DailyIntention> {
    return this.fetch<DailyIntention>(`/api/journal/intentions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed }),
    });
  }

  // Goal completions
  createGoalCompletion(goal_id: string, entry_id: string): Promise<GoalCompletion> {
    return this.fetch<GoalCompletion>('/api/goals/completions', {
      method: 'POST',
      body: JSON.stringify({ goal_id, entry_id }),
    });
  }

  // Goals
  getGoals(): Promise<Goal[]> {
    return this.fetch<Goal[]>('/api/goals');
  }
  createGoal(dto: CreateGoalDto): Promise<Goal> {
    return this.fetch<Goal>('/api/goals', { method: 'POST', body: JSON.stringify(dto) });
  }
  updateGoal(id: string, dto: UpdateGoalDto): Promise<Goal> {
    return this.fetch<Goal>(`/api/goals/${id}`, { method: 'PATCH', body: JSON.stringify(dto) });
  }
  deleteGoal(id: string): Promise<void> {
    return this.fetch<void>(`/api/goals/${id}`, { method: 'DELETE' });
  }
  suggestGoals(): Promise<SuggestedGoal[]> {
    return this.fetch<SuggestedGoal[]>('/api/goals/suggest', { method: 'POST' });
  }

  // Transcription
  transcribeEntry(entry_id: string, video_url: string): Promise<{ transcript: string; sentiment_summary: string }> {
    return this.fetch('/api/transcribe', { method: 'POST', body: JSON.stringify({ entry_id, video_url }) });
  }

  // Upload
  getSignedUploadUrl(entry_id: string, content_type: string): Promise<{ signed_url: string; path: string }> {
    return this.fetch('/api/upload/signed-url', {
      method: 'POST',
      body: JSON.stringify({ entry_id, content_type }),
    });
  }

  // Insights
  getInsights(): Promise<InsightSession[]> {
    return this.fetch<InsightSession[]>('/api/insights');
  }
  getInsight(id: string): Promise<InsightSession> {
    return this.fetch<InsightSession>(`/api/insights/${id}`);
  }
  generateInsight(): Promise<InsightSession> {
    return this.fetch<InsightSession>('/api/insights/generate', { method: 'POST' });
  }

  // User
  getMe(): Promise<User> {
    return this.fetch<User>('/api/users/me');
  }
  updateMe(dto: UpdateUserDto): Promise<User> {
    return this.fetch<User>('/api/users/me', { method: 'PATCH', body: JSON.stringify(dto) });
  }
}
