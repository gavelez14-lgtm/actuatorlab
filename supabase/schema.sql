-- ActuatorLab: Supabase-ready schema (not required for the local demo).
-- The demo reads content from src/data/*.ts and stores progress in localStorage.
-- To migrate: seed the content tables from src/data, then implement
-- ProgressRepository (src/lib/progress.ts) against the user_* tables.
-- No personal data beyond the auth user id is stored.

create table actuator_families (
  id            text primary key,              -- 'cp', 'gp', ...
  code          text not null,
  name          text not null,
  technology    text not null,
  power_source  text not null,
  movement      text not null,
  status        text not null check (status in ('interactive','planned')),
  summary       text not null,
  principles    jsonb not null default '[]',   -- general engineering principles
  manufacturer_verified boolean not null default false,
  manufacturer_notes    text,
  source_reference      text                   -- document id/URL once verified
);

create table actuator_models (
  id          uuid primary key default gen_random_uuid(),
  family_id   text not null references actuator_families(id),
  name        text not null,
  -- Only populate from verified manufacturer documentation.
  data        jsonb not null default '{}',
  verified    boolean not null default false,
  source_reference text
);

create table components (
  id          text primary key,                -- 'piston', 'yoke', ...
  name        text not null,
  role        text not null,
  function    text not null,
  description text not null,
  caveat      text
);

create table lessons (
  slug        text primary key,
  number      int  not null,
  title       text not null,
  level       text not null check (level in ('Beginner','Intermediate','Advanced')),
  status      text not null check (status in ('available','planned')),
  minutes     int,
  summary     text not null,
  objectives  jsonb not null default '[]',
  terms       jsonb not null default '[]'
);

create table lesson_steps (
  id          uuid primary key default gen_random_uuid(),
  lesson_slug text not null references lessons(slug) on delete cascade,
  position    int  not null,
  heading     text not null,
  body        jsonb not null,                  -- array of paragraphs
  figure      text,
  unique (lesson_slug, position)
);

create table quizzes (
  slug        text primary key,
  title       text not null,
  level       text not null,
  description text not null,
  pass_mark   numeric not null default 0.7,
  lesson_slug text references lessons(slug)    -- null for standalone assessments
);

create table quiz_questions (
  id          text not null,
  quiz_slug   text not null references quizzes(slug) on delete cascade,
  position    int  not null,
  prompt      text not null,
  options     jsonb not null,
  answer      int  not null,
  explanation text not null,
  primary key (quiz_slug, id)
);

create table simulation_configurations (
  id            uuid primary key default gen_random_uuid(),
  family_id     text not null references actuator_families(id),
  action_type   text not null check (action_type in ('double-acting','spring-return')),
  fail_position text not null check (fail_position in ('fail-closed','fail-open','fail-in-place')),
  valve_type    text not null default 'ball',
  parameters    jsonb not null default '{}',   -- illustrative model parameters
  illustrative  boolean not null default true
);

-- Per-user progress. user_id references Supabase auth; nothing else personal.
create table user_lesson_progress (
  user_id      uuid not null references auth.users(id) on delete cascade,
  lesson_slug  text not null references lessons(slug),
  completed_at timestamptz,
  check_answers jsonb not null default '{}',
  primary key (user_id, lesson_slug)
);

create table user_quiz_attempts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  quiz_slug   text not null references quizzes(slug),
  answers     jsonb not null,
  score       int not null,
  total       int not null,
  created_at  timestamptz not null default now()
);

create table user_recent_topics (
  user_id   uuid not null references auth.users(id) on delete cascade,
  topic_id  text not null,
  title     text not null,
  href      text not null,
  visited_at timestamptz not null default now(),
  primary key (user_id, topic_id)
);

alter table user_lesson_progress enable row level security;
alter table user_quiz_attempts   enable row level security;
alter table user_recent_topics   enable row level security;

create policy "own progress" on user_lesson_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own attempts" on user_quiz_attempts   for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own recents"  on user_recent_topics   for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
