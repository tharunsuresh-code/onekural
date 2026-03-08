/-- Thirukkural Daily — Database Schema
-- Run this in your Supabase SQL Editor

-- ─────────────────────────────────────────
-- kurals (static, seeded from open source JSON — 1330 rows)
-- ─────────────────────────────────────────
create table if not exists kurals (
  id                   int primary key,          -- 1 to 1330
  book                 int not null,             -- 1=Aram, 2=Porul, 3=Inbam
  chapter              int not null,             -- 1 to 133
  chapter_name_tamil   text not null,
  chapter_name_english text not null,
  kural_tamil          text not null,            -- Line1 + "\n" + Line2
  transliteration      text not null,            -- transliteration1 + "\n" + transliteration2
  meaning_english      text not null,            -- short English translation
  scholars             jsonb not null default '[]', -- [{name, commentary}]
  themes               text[] default '{}'
);

-- Note: no daily_kurals table — daily kural ID is computed with getDailyKuralId() in lib/kurals.ts

-- ─────────────────────────────────────────
-- journals — per-user reflections (logged-in)
-- ─────────────────────────────────────────
create table if not exists journals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  kural_id    int  not null references kurals(id),
  reflection  text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, kural_id)
);

-- ─────────────────────────────────────────
-- favorites — per-user (logged-in)
-- ─────────────────────────────────────────
create table if not exists favorites (
  user_id  uuid not null references auth.users on delete cascade,
  kural_id int  not null references kurals(id),
  primary key (user_id, kural_id)
);

-- ─────────────────────────────────────────
-- push_subscriptions — Phase 2
-- ─────────────────────────────────────────
create table if not exists push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  subscription jsonb not null,
  created_at   timestamptz not null default now(),
  unique (user_id)
);

-- If table already exists, add the unique constraint:
-- ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_user_id_unique UNIQUE (user_id);

-- ─────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────
alter table kurals             enable row level security;
alter table journals           enable row level security;
alter table favorites          enable row level security;
alter table push_subscriptions enable row level security;

create policy "kurals are public" on kurals for select using (true);

create policy "users manage own journals"
  on journals for all using (auth.uid() = user_id);

create policy "users manage own favorites"
  on favorites for all using (auth.uid() = user_id);

create policy "users manage own push subscriptions"
  on push_subscriptions for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- Auto-update updated_at on journal edits
-- ─────────────────────────────────────────
create or replace function public.update_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger journals_updated_at
  before update on journals
  for each row execute function update_updated_at();
