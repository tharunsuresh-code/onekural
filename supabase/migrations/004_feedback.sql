-- Feedback table — stores user-submitted feedback
-- user_id is nullable to allow anonymous submissions

create table if not exists feedback (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  message    text not null,
  user_id    uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

alter table feedback enable row level security;

-- Anyone (including anonymous) can insert feedback
create policy "anyone can submit feedback"
  on feedback for insert with check (true);

-- Only service role can read (view via Supabase dashboard)
