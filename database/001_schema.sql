-- 永護寧家電訪：安全資料庫初版（設計稿；尚未套用至正式資料庫）
-- PostgreSQL / Supabase Auth。正式上線前須完成帳號開通、RLS 與權限測試。
-- 僅存結構；不得將真實個案資料提交至 GitHub。
create extension if not exists pgcrypto;

create table if not exists public.supervisor_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('supervisor','manager')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.care_cases (
  id uuid primary key default gen_random_uuid(),
  case_code text not null unique,
  case_name text not null,
  supervisor_id uuid not null references public.supervisor_profiles(user_id),
  status text not null default 'active' check (status in ('active','closed')),
  approved_services jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.care_cases(id),
  supervisor_id uuid not null references public.supervisor_profiles(user_id),
  visit_date date not null,
  visit_type text not null check (visit_type in ('home','phone')),
  respondent text,
  information_source text,
  facts text,
  selections jsonb not null default '{}'::jsonb,
  narrative text not null default '',
  status text not null default 'draft' check (status in ('draft','reviewed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.visit_revisions (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  editor_id uuid not null references public.supervisor_profiles(user_id),
  previous_narrative text,
  revised_narrative text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_cases_supervisor on public.care_cases(supervisor_id);
create index if not exists idx_visits_case_date on public.visits(case_id,visit_date desc);
create index if not exists idx_visits_supervisor_date on public.visits(supervisor_id,visit_date desc);

alter table public.supervisor_profiles enable row level security;
alter table public.care_cases enable row level security;
alter table public.visits enable row level security;
alter table public.visit_revisions enable row level security;

-- 不建立任何公開 / anonymous 存取政策；預設拒絕。
-- 使用 SECURITY DEFINER 避免角色政策自我遞迴。
create or replace function public.is_yhn_manager()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.supervisor_profiles
    where user_id = (select auth.uid()) and role = 'manager' and active
  );
$$;

revoke all on function public.is_yhn_manager() from public;
grant execute on function public.is_yhn_manager() to authenticated;

create policy "profile self or manager read" on public.supervisor_profiles
for select to authenticated
using (user_id = (select auth.uid()) or public.is_yhn_manager());

create policy "case assigned or manager read" on public.care_cases
for select to authenticated
using (
  public.is_yhn_manager() or
  (supervisor_id = (select auth.uid()) and exists (
    select 1 from public.supervisor_profiles p
    where p.user_id = (select auth.uid()) and p.active
  ))
);

create policy "case manager insert" on public.care_cases
for insert to authenticated with check (public.is_yhn_manager());
create policy "case manager update" on public.care_cases
for update to authenticated using (public.is_yhn_manager())
with check (public.is_yhn_manager());

create policy "visit authorized read" on public.visits
for select to authenticated
using (
  public.is_yhn_manager() or
  (supervisor_id = (select auth.uid()) and exists (
    select 1 from public.care_cases c
    where c.id = case_id and c.supervisor_id = (select auth.uid())
  ))
);

create policy "visit assigned insert" on public.visits
for insert to authenticated
with check (
  supervisor_id = (select auth.uid())
  and exists (
    select 1 from public.supervisor_profiles p
    where p.user_id = (select auth.uid()) and p.active
  )
  and exists (
    select 1 from public.care_cases c
    where c.id = case_id and c.supervisor_id = (select auth.uid()) and c.status = 'active'
  )
);

create policy "visit assigned update" on public.visits
for update to authenticated
using (
  supervisor_id = (select auth.uid()) and
  exists (select 1 from public.care_cases c where c.id = case_id and c.supervisor_id = (select auth.uid()))
)
with check (
  supervisor_id = (select auth.uid()) and
  exists (select 1 from public.care_cases c where c.id = case_id and c.supervisor_id = (select auth.uid()))
);

create policy "revision authorized read" on public.visit_revisions
for select to authenticated
using (
  public.is_yhn_manager() or exists (
    select 1 from public.visits v where v.id = visit_id and v.supervisor_id = (select auth.uid())
  )
);
create policy "revision authorized insert" on public.visit_revisions
for insert to authenticated
with check (
  editor_id = (select auth.uid()) and exists (
    select 1 from public.visits v where v.id = visit_id and v.supervisor_id = (select auth.uid())
  )
);

-- 注意：正式上線前需補齊「主管受控建立帳號」、
-- 版本寫入原子性、不可竄改稽核紀錄、刪除/保留政策與備份還原測試。
