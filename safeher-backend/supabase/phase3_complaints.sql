-- Run ONCE in the SafeHer_db Supabase SQL Editor, AFTER safeher_schema.sql.
-- Phase 3 MVP: authenticated, adult-only, category-only complaint requests.
-- No free-text narratives, attachments, contact details or case information.
begin;
create table if not exists public.complaints (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    category text not null check (category in ('legal', 'psychosocial', 'community', 'other')),
    status text not null default 'received' check (status in ('received', 'under_review', 'closed')),
    created_at timestamptz not null default now()
);
create index if not exists idx_safeher_complaints_user_created
  on public.complaints(user_id, created_at desc);
alter table public.complaints enable row level security;
drop policy if exists safeher_complaints_select_own on public.complaints;
drop policy if exists safeher_complaints_insert_adult_own on public.complaints;
create policy safeher_complaints_select_own on public.complaints
  for select to authenticated using (user_id = (select auth.uid()));
create policy safeher_complaints_insert_adult_own on public.complaints
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and status = 'received'
    and exists (select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.age_group = 'adult')
  );
-- Authenticated users cannot update, delete, or read other users' requests.
revoke all on public.complaints from anon, authenticated;
grant select, insert on public.complaints to authenticated;
commit;
