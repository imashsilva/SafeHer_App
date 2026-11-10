-- Run AFTER phase3_complaints.sql in the SafeHer Supabase SQL Editor.
-- Extends existing records safely: existing complaints are preserved.
-- Only fictional DEMO notes; not approved for real incident narratives.
begin;

alter table public.complaints
  add column if not exists demo_note text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'safeher_complaints_demo_note_max'
      and conrelid = 'public.complaints'::regclass
  ) then
    alter table public.complaints
      add constraint safeher_complaints_demo_note_max
      check (demo_note is null or char_length(demo_note) <= 500);
  end if;
end $$;

-- The existing select-own and adult-only insert policies remain in place.
drop policy if exists safeher_complaints_update_adult_own_received on public.complaints;
create policy safeher_complaints_update_adult_own_received on public.complaints
  for update to authenticated
  using (
    user_id = (select auth.uid())
    and status = 'received'
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.age_group = 'adult'
    )
  )
  with check (
    user_id = (select auth.uid())
    and status = 'received'
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.age_group = 'adult'
    )
  );

-- No UPDATE permission on status, user_id, created_at, or id.
revoke update on public.complaints from authenticated;
grant update (category, demo_note) on public.complaints to authenticated;
commit;
