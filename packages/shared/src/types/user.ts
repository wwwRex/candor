export type AdviceFrequency = 'daily' | 'every_2_days' | 'weekly';
export type RecordingMode = 'quick' | 'guided';

export interface User {
  id: string;
  email: string;
  advice_frequency: AdviceFrequency;
  reminder_enabled: boolean;
  reminder_time: string | null;
  recording_mode: RecordingMode;
  push_token: string | null;
  onboarding_complete: boolean;
  created_at: string;
}

export interface UpdateUserDto {
  advice_frequency?: AdviceFrequency;
  reminder_enabled?: boolean;
  reminder_time?: string | null;
  recording_mode?: RecordingMode;
  push_token?: string;
  onboarding_complete?: boolean;
}
