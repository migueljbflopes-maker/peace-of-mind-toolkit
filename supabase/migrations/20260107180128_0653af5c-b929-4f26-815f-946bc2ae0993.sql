-- EXTENSIONS
create extension if not exists pgcrypto;

-- 1) User profiles (multi-language + preferences)
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  locale text not null default 'en',
  country text,
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Premium entitlements (backend source of truth)
create table if not exists public.premium_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_premium boolean not null default false,
  plan_name text not null default 'Personalized Resiliency Plan',
  price_eur int not null default 49,
  updated_at timestamptz not null default now()
);

-- 3) Bookmarks (library/tips/news) - login unlock
create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('tip','library_doc','weekly_briefing')),
  ref_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, kind, ref_id)
);

create index if not exists bookmarks_user_idx on public.bookmarks (user_id, created_at desc);

-- 4) Risk assessments (save)
create table if not exists public.risk_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  country text,
  city text,
  score int,
  risk_level text,
  inputs jsonb not null default '{}'::jsonb,
  breakdown jsonb not null default '{}'::jsonb
);

create index if not exists risk_user_idx on public.risk_assessments (user_id, created_at desc);

-- 5) Supplies plans (save)
create table if not exists public.supplies_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  days int not null default 14,
  household_size_bucket text,
  preparedness_pct int,
  inputs jsonb not null default '{}'::jsonb,
  plan jsonb not null default '{}'::jsonb
);

create index if not exists supplies_user_idx on public.supplies_plans (user_id, created_at desc);

-- 6) Vault (ciphertext only) - Premium
create table if not exists public.vault_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  section text not null,
  ciphertext text not null,
  iv text not null,
  salt text not null,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, section)
);

create index if not exists vault_user_idx on public.vault_items (user_id);

-- 7) Plans A & B (ciphertext only) - Premium
create table if not exists public.plan_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_type text not null check (plan_type in ('A','B')),
  ciphertext text not null,
  iv text not null,
  salt text not null,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plan_type)
);

create index if not exists plans_user_idx on public.plan_items (user_id);

-- 8) Red Folder export metadata
create table if not exists public.exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  export_type text not null check (export_type in ('red_folder_pdf')),
  locale text not null default 'en',
  storage_path text,
  created_at timestamptz not null default now()
);

create index if not exists exports_user_idx on public.exports (user_id, created_at desc);

-- 9) Encrypted backup/restore - Premium
create table if not exists public.backups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ciphertext_bundle text not null,
  iv text not null,
  salt text not null,
  version int not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists backups_user_idx on public.backups (user_id, created_at desc);

-- 10) AI jobs (no sensitive plaintext)
create table if not exists public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_type text not null check (job_type in ('plan_a_draft','plan_b_draft')),
  status text not null default 'queued' check (status in ('queued','running','done','failed')),
  input_summary jsonb not null default '{}'::jsonb,
  output jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_jobs_user_idx on public.ai_jobs (user_id, created_at desc);

-- RLS
alter table public.user_profiles enable row level security;
alter table public.premium_entitlements enable row level security;
alter table public.bookmarks enable row level security;
alter table public.risk_assessments enable row level security;
alter table public.supplies_plans enable row level security;
alter table public.vault_items enable row level security;
alter table public.plan_items enable row level security;
alter table public.exports enable row level security;
alter table public.backups enable row level security;
alter table public.ai_jobs enable row level security;

-- user_profiles policies
create policy "profiles read own" on public.user_profiles for select using (auth.uid() = user_id);
create policy "profiles upsert own" on public.user_profiles for insert with check (auth.uid() = user_id);
create policy "profiles update own" on public.user_profiles for update using (auth.uid() = user_id);

-- entitlements (read only - write via service role)
create policy "entitlements read own" on public.premium_entitlements for select using (auth.uid() = user_id);

-- bookmarks policies
create policy "bookmarks read own" on public.bookmarks for select using (auth.uid() = user_id);
create policy "bookmarks write own" on public.bookmarks for insert with check (auth.uid() = user_id);
create policy "bookmarks update own" on public.bookmarks for update using (auth.uid() = user_id);
create policy "bookmarks delete own" on public.bookmarks for delete using (auth.uid() = user_id);

-- risk/supplies policies
create policy "risk read own" on public.risk_assessments for select using (auth.uid() = user_id);
create policy "risk write own" on public.risk_assessments for insert with check (auth.uid() = user_id);
create policy "risk update own" on public.risk_assessments for update using (auth.uid() = user_id);

create policy "supplies read own" on public.supplies_plans for select using (auth.uid() = user_id);
create policy "supplies write own" on public.supplies_plans for insert with check (auth.uid() = user_id);
create policy "supplies update own" on public.supplies_plans for update using (auth.uid() = user_id);

-- vault policies
create policy "vault read own" on public.vault_items for select using (auth.uid() = user_id);
create policy "vault upsert own" on public.vault_items for insert with check (auth.uid() = user_id);
create policy "vault update own" on public.vault_items for update using (auth.uid() = user_id);

-- plan_items policies
create policy "plans read own" on public.plan_items for select using (auth.uid() = user_id);
create policy "plans upsert own" on public.plan_items for insert with check (auth.uid() = user_id);
create policy "plans update own" on public.plan_items for update using (auth.uid() = user_id);

-- exports policies
create policy "exports read own" on public.exports for select using (auth.uid() = user_id);
create policy "exports write own" on public.exports for insert with check (auth.uid() = user_id);

-- backups policies
create policy "backups read own" on public.backups for select using (auth.uid() = user_id);
create policy "backups write own" on public.backups for insert with check (auth.uid() = user_id);

-- ai_jobs policies
create policy "ai jobs read own" on public.ai_jobs for select using (auth.uid() = user_id);
create policy "ai jobs write own" on public.ai_jobs for insert with check (auth.uid() = user_id);
create policy "ai jobs update own" on public.ai_jobs for update using (auth.uid() = user_id);