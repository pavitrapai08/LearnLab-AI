-- LearnLab AI — full schema + RLS
-- Paste this entire file into the Supabase SQL editor (Dashboard → SQL Editor → New query) and run it.
-- Run once after creating your project. Safe to re-run: uses "if not exists" guards.

-- ─── documents ────────────────────────────────────────────────────────────────

create table if not exists documents (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null,
  filename       text,
  storage_path   text,
  source_type    text not null check (source_type in ('pdf', 'docx', 'image', 'paste')),
  extracted_text text,
  pages          int,
  pages_done     int default 0,
  status         text not null default 'processing'
                   check (status in ('processing', 'ready', 'error')),
  created_at     timestamptz default now()
);

alter table documents enable row level security;

drop policy if exists "own rows" on documents;
create policy "own rows" on documents
  for all
  using  (session_id = auth.uid())
  with check (session_id = auth.uid());

-- ─── quizzes ──────────────────────────────────────────────────────────────────

create table if not exists quizzes (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null,
  document_id     uuid references documents(id) on delete set null,
  subject         text,
  grade           text,
  output_language text,
  question_type   text check (question_type in ('mcq', 'true_false', 'short_answer')),
  difficulty      text check (difficulty in ('easy', 'medium', 'hard')),
  questions       jsonb not null default '[]',
  created_at      timestamptz default now()
);

alter table quizzes enable row level security;

drop policy if exists "own rows" on quizzes;
create policy "own rows" on quizzes
  for all
  using  (session_id = auth.uid())
  with check (session_id = auth.uid());

-- ─── quiz_attempts ────────────────────────────────────────────────────────────

create table if not exists quiz_attempts (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  quiz_id    uuid not null references quizzes(id) on delete cascade,
  score      numeric,
  total      int,
  answers    jsonb not null default '[]',
  created_at timestamptz default now()
);

alter table quiz_attempts enable row level security;

drop policy if exists "own rows" on quiz_attempts;
create policy "own rows" on quiz_attempts
  for all
  using  (session_id = auth.uid())
  with check (session_id = auth.uid());

-- ─── flashcard_decks ──────────────────────────────────────────────────────────

create table if not exists flashcard_decks (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null,
  document_id     uuid references documents(id) on delete set null,
  title           text,
  output_language text,
  cards           jsonb not null default '[]',
  created_at      timestamptz default now()
);

alter table flashcard_decks enable row level security;

drop policy if exists "own rows" on flashcard_decks;
create policy "own rows" on flashcard_decks
  for all
  using  (session_id = auth.uid())
  with check (session_id = auth.uid());

-- ─── summaries ────────────────────────────────────────────────────────────────

create table if not exists summaries (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null,
  document_id     uuid references documents(id) on delete set null,
  output_language text,
  quick_summary   text,
  key_points      jsonb default '[]',
  terms           jsonb default '[]',
  remember        jsonb default '[]',
  created_at      timestamptz default now()
);

alter table summaries enable row level security;

drop policy if exists "own rows" on summaries;
create policy "own rows" on summaries
  for all
  using  (session_id = auth.uid())
  with check (session_id = auth.uid());

-- ─── lesson_plans ─────────────────────────────────────────────────────────────

create table if not exists lesson_plans (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null,
  subject         text,
  grade           text,
  topic           text,
  duration_min    int,
  output_language text,
  content         jsonb not null default '{}',
  created_at      timestamptz default now()
);

alter table lesson_plans enable row level security;

drop policy if exists "own rows" on lesson_plans;
create policy "own rows" on lesson_plans
  for all
  using  (session_id = auth.uid())
  with check (session_id = auth.uid());

-- ─── study_plans ──────────────────────────────────────────────────────────────

create table if not exists study_plans (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  exam_date  date,
  subjects   jsonb default '[]',
  schedule   jsonb default '[]',
  created_at timestamptz default now()
);

alter table study_plans enable row level security;

drop policy if exists "own rows" on study_plans;
create policy "own rows" on study_plans
  for all
  using  (session_id = auth.uid())
  with check (session_id = auth.uid());

-- ─── daily_activity ───────────────────────────────────────────────────────────
-- One row per user per UTC day. Upserted on a meaningful action (successful
-- generation or submitted quiz attempt) — never on a mere app open.
-- Streak is derived by counting consecutive dates client-side.

create table if not exists daily_activity (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null,
  activity_date date not null,
  created_at    timestamptz default now(),
  unique (session_id, activity_date)
);

alter table daily_activity enable row level security;

drop policy if exists "own rows" on daily_activity;
create policy "own rows" on daily_activity
  for all
  using  (session_id = auth.uid())
  with check (session_id = auth.uid());

-- ─── Storage RLS ──────────────────────────────────────────────────────────────
-- Run AFTER creating the "uploads" bucket in the Supabase Dashboard → Storage.
-- Each user may only access objects whose path begins with their {uid}/.

drop policy if exists "user folder" on storage.objects;
create policy "user folder" on storage.objects
  for all
  using (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
