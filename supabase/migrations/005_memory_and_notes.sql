-- AI memory: running context Claude builds about each user
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_context text;

-- Insight rating: 1 = helpful, -1 = not helpful
ALTER TABLE insight_sessions ADD COLUMN IF NOT EXISTS rating smallint CHECK (rating IN (-1, 1));

-- Entry notes: user-written notes attached to a journal entry
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS notes text;
