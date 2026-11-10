-- SafeHer MVP database schema for Supabase PostgreSQL
-- Paste this entire script into Supabase SQL Editor and run once.
-- This script is designed for a fresh SafeHer schema. Review before rerunning
-- against a database that already contains tables with these names.

begin;

-- 1) Core user profile table. Profiles are created automatically on signup.
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text unique,
    age_group text not null default 'not_provided'
        check (age_group in ('under_18', 'adult', 'not_provided')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 2) Appointment requests. Users can only create requests for their own account.
create table if not exists public.appointments (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    service text not null check (char_length(trim(service)) between 3 and 120),
    professional text not null default 'Pending assignment',
    starts_at timestamptz not null,
    duration_minutes integer not null default 45
        check (duration_minutes between 15 and 120),
    format text not null check (format in ('online', 'in_person', 'phone')),
    status text not null default 'requested'
        check (status in ('requested', 'confirmed', 'completed', 'cancelled', 'no_show')),
    cancelled_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 3) Sponsored credit allocations. Ordinary users can read their own balances only.
create table if not exists public.credits (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    sponsor text not null check (char_length(trim(sponsor)) > 0),
    amount numeric(12,2) not null check (amount >= 0),
    remaining numeric(12,2) not null check (remaining >= 0 and remaining <= amount),
    currency char(3) not null default 'LKR',
    purpose text not null,
    expires_at date,
    created_at timestamptz not null default now()
);

-- 4) Append-only audit trail for credit allocation/redemption/refund/adjustment.
create table if not exists public.credit_transactions (
    id uuid primary key default gen_random_uuid(),
    credit_id uuid not null references public.credits(id) on delete restrict,
    user_id uuid not null references public.profiles(id) on delete cascade,
    transaction_type text not null
        check (transaction_type in ('allocation', 'reservation', 'redemption', 'refund', 'adjustment', 'expiry')),
    amount numeric(12,2) not null check (amount > 0),
    currency char(3) not null default 'LKR',
    description text not null,
    created_at timestamptz not null default now()
);

-- 5) User privacy preferences.
create table if not exists public.privacy_settings (
    user_id uuid primary key references public.profiles(id) on delete cascade,
    share_anonymous_insights boolean not null default false,
    email_updates boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Helpful indexes for common user-specific queries.
create index if not exists idx_appointments_user_id on public.appointments(user_id);
create index if not exists idx_appointments_starts_at on public.appointments(starts_at);
create index if not exists idx_appointments_status on public.appointments(status);
create index if not exists idx_credits_user_id on public.credits(user_id);
create index if not exists idx_credit_transactions_user_id on public.credit_transactions(user_id);
create index if not exists idx_credit_transactions_credit_id on public.credit_transactions(credit_id);

-- Keep updated_at consistent.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_appointments_updated_at on public.appointments;
create trigger trg_appointments_updated_at
before update on public.appointments
for each row execute function public.set_updated_at();

drop trigger if exists trg_privacy_settings_updated_at on public.privacy_settings;
create trigger trg_privacy_settings_updated_at
before update on public.privacy_settings
for each row execute function public.set_updated_at();

-- Create a profile after each Supabase Auth signup.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, email)
    values (new.id, new.email)
    on conflict (id) do update set email = excluded.email;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created_safeher on auth.users;
create trigger on_auth_user_created_safeher
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- Keep profile email synchronized if the Auth email changes.
create or replace function public.handle_auth_email_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if new.email is distinct from old.email then
        update public.profiles
        set email = new.email
        where id = new.id;
    end if;
    return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated_safeher on auth.users;
create trigger on_auth_user_email_updated_safeher
after update of email on auth.users
for each row execute function public.handle_auth_email_update();

-- Create default privacy preferences when the profile is created.
create or replace function public.create_default_privacy_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.privacy_settings (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
    return new;
end;
$$;

drop trigger if exists trg_profile_default_privacy on public.profiles;
create trigger trg_profile_default_privacy
after insert on public.profiles
for each row execute function public.create_default_privacy_settings();

-- Authenticated users may only cancel their own appointments.
-- All other appointment fields remain immutable to ordinary users.
create or replace function public.protect_user_appointment_updates()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    if auth.uid() is not null then
        if new.user_id is distinct from old.user_id
           or new.service is distinct from old.service
           or new.professional is distinct from old.professional
           or new.starts_at is distinct from old.starts_at
           or new.duration_minutes is distinct from old.duration_minutes
           or new.format is distinct from old.format
           or new.created_at is distinct from old.created_at then
            raise exception 'Appointment details cannot be edited by the account owner';
        end if;

        if old.status not in ('requested', 'confirmed')
           or new.status <> 'cancelled' then
            raise exception 'Account owners may only cancel pending or confirmed appointments';
        end if;

        new.cancelled_at = now();
    end if;

    return new;
end;
$$;

drop trigger if exists trg_protect_user_appointment_updates on public.appointments;
create trigger trg_protect_user_appointment_updates
before update on public.appointments
for each row execute function public.protect_user_appointment_updates();

-- Enable Row Level Security on every user-data table.
alter table public.profiles enable row level security;
alter table public.appointments enable row level security;
alter table public.credits enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.privacy_settings enable row level security;

-- Remove old policies with these names before creating the intended policies.
drop policy if exists "safeher_profiles_select_own" on public.profiles;
drop policy if exists "safeher_appointments_select_own" on public.appointments;
drop policy if exists "safeher_appointments_insert_adult_own" on public.appointments;
drop policy if exists "safeher_appointments_cancel_own" on public.appointments;
drop policy if exists "safeher_credits_select_own" on public.credits;
drop policy if exists "safeher_credit_transactions_select_own" on public.credit_transactions;
drop policy if exists "safeher_privacy_select_own" on public.privacy_settings;
drop policy if exists "safeher_privacy_insert_own" on public.privacy_settings;
drop policy if exists "safeher_privacy_update_own" on public.privacy_settings;

-- Profiles: users can read their own profile. Age-group changes are admin-controlled.
create policy "safeher_profiles_select_own"
on public.profiles for select to authenticated
using (id = (select auth.uid()));

-- Appointments: users can see their own rows.
create policy "safeher_appointments_select_own"
on public.appointments for select to authenticated
using (user_id = (select auth.uid()));

-- Only adult profiles can create appointment requests.
-- 'under_18' and 'not_provided' accounts are denied.
create policy "safeher_appointments_insert_adult_own"
on public.appointments for insert to authenticated
with check (
    user_id = (select auth.uid())
    and status = 'requested'
    and exists (
        select 1
        from public.profiles p
        where p.id = (select auth.uid())
          and p.age_group = 'adult'
    )
);

-- Account owners may cancel requested/confirmed appointments only.
create policy "safeher_appointments_cancel_own"
on public.appointments for update to authenticated
using (
    user_id = (select auth.uid())
    and status in ('requested', 'confirmed')
)
with check (
    user_id = (select auth.uid())
    and status = 'cancelled'
);

-- Credits and credit ledger are read-only for ordinary users.
create policy "safeher_credits_select_own"
on public.credits for select to authenticated
using (user_id = (select auth.uid()));

create policy "safeher_credit_transactions_select_own"
on public.credit_transactions for select to authenticated
using (user_id = (select auth.uid()));

-- Privacy settings: users can read and update only their own preferences.
create policy "safeher_privacy_select_own"
on public.privacy_settings for select to authenticated
using (user_id = (select auth.uid()));

create policy "safeher_privacy_insert_own"
on public.privacy_settings for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "safeher_privacy_update_own"
on public.privacy_settings for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Explicit grants for the Supabase authenticated role. RLS still limits rows.
grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update on public.appointments to authenticated;
grant select on public.credits to authenticated;
grant select on public.credit_transactions to authenticated;
grant select, insert, update on public.privacy_settings to authenticated;

commit;

-- IMPORTANT:
-- New profiles default to age_group='not_provided'. Do not set this from
-- untrusted client metadata and do not treat a self-declared age as verified.
-- For development, an authorized administrator may update a test account:
-- update public.profiles set age_group = 'adult' where id = '<AUTH_USER_UUID>';
--
-- Do not grant normal users permission to write credits or credit_transactions.
-- Credit allocation and redemption need an audited, authorized workflow.
