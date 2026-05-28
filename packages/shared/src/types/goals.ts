export type GoalSource = 'user' | 'ai_suggested';

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  source: GoalSource;
  is_active: boolean;
  created_at: string;
}

export interface CreateGoalDto {
  title: string;
  description?: string;
  source?: GoalSource;
}

export interface UpdateGoalDto {
  title?: string;
  description?: string;
  is_active?: boolean;
}

export interface SuggestedGoal {
  title: string;
  rationale: string;
}
