-- Security baseline for ROXBJJ Manager.
-- Apply this in Supabase before deploying the frontend changes that depend on
-- profiles, alunos.user_id, and the RPC functions below.

begin;

create type public.app_role as enum ('admin', 'professor', 'aluno');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role public.app_role not null default 'aluno',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_email_key on public.profiles (lower(email));
create index if not exists profiles_role_idx on public.profiles (role);

create table if not exists public.alunos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  nome text not null,
  email text not null,
  faixa text not null default 'branca' check (faixa in ('branca', 'azul', 'roxa', 'marrom', 'preta')),
  grau integer not null default 0 check (grau between 0 and 4),
  pago boolean not null default false,
  vencimento integer not null default 10 check (vencimento between 1 and 31),
  presencas integer not null default 0 check (presencas >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.alunos
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.alunos
  alter column faixa set default 'branca',
  alter column grau set default 0,
  alter column pago set default false,
  alter column vencimento set default 10,
  alter column presencas set default 0;

update public.alunos
set presencas = 0
where presencas is null;

alter table public.alunos
  alter column presencas set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'alunos_user_id_key'
      and conrelid = 'public.alunos'::regclass
  ) then
    alter table public.alunos add constraint alunos_user_id_key unique (user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'alunos_faixa_check'
      and conrelid = 'public.alunos'::regclass
  ) then
    alter table public.alunos
      add constraint alunos_faixa_check check (faixa in ('branca', 'azul', 'roxa', 'marrom', 'preta'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'alunos_grau_check'
      and conrelid = 'public.alunos'::regclass
  ) then
    alter table public.alunos
      add constraint alunos_grau_check check (grau between 0 and 4);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'alunos_vencimento_check'
      and conrelid = 'public.alunos'::regclass
  ) then
    alter table public.alunos
      add constraint alunos_vencimento_check check (vencimento between 1 and 31);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'alunos_presencas_check'
      and conrelid = 'public.alunos'::regclass
  ) then
    alter table public.alunos
      add constraint alunos_presencas_check check (presencas >= 0);
  end if;
end $$;

update public.alunos a
set user_id = u.id
from auth.users u
where a.user_id is null
  and lower(a.email) = lower(u.email);

do $$
begin
  if exists (select 1 from public.alunos where user_id is null) then
    raise exception 'All alunos rows must be linked to auth.users through user_id before enabling the secure portal.';
  end if;
end $$;

alter table public.alunos
  alter column user_id set not null;

insert into public.profiles (id, email, role)
select u.id, u.email, 'aluno'
from auth.users u
where u.email is not null
on conflict (id) do nothing;

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

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_alunos_updated_at on public.alunos;
create trigger set_alunos_updated_at
before update on public.alunos
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, coalesce(new.email, ''), 'aluno')
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid());
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('admin', 'professor'), false);
$$;

create or replace function public.bootstrap_first_admin(target_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
begin
  if exists (select 1 from public.profiles where role = 'admin') then
    raise exception 'An admin profile already exists.';
  end if;

  select u.id into target_user_id
  from auth.users u
  where lower(u.email) = lower(target_email)
  limit 1;

  if target_user_id is null then
    raise exception 'No auth user found for %.', target_email;
  end if;

  insert into public.profiles (id, email, role)
  select u.id, u.email, 'admin'
  from auth.users u
  where u.id = target_user_id
  on conflict (id) do update
    set role = 'admin',
        email = excluded.email,
        updated_at = now();
end;
$$;

create or replace function public.registrar_presenca()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.';
  end if;

  update public.alunos
  set presencas = coalesce(presencas, 0) + 1
  where user_id = (select auth.uid());

  if not found then
    raise exception 'Aluno profile not found.';
  end if;
end;
$$;

create or replace function public.atualizar_graduacao_aluno(p_aluno_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'Not authorized.';
  end if;

  update public.alunos
  set grau = case when grau >= 4 then 0 else grau + 1 end
  where id = p_aluno_id;

  if not found then
    raise exception 'Aluno not found.';
  end if;
end;
$$;

alter table public.profiles enable row level security;
alter table public.alunos enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or public.is_admin()
);

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "alunos_select_own_or_staff" on public.alunos;
create policy "alunos_select_own_or_staff"
on public.alunos
for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.is_staff()
);

drop policy if exists "alunos_insert_admin" on public.alunos;
create policy "alunos_insert_admin"
on public.alunos
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "alunos_update_admin" on public.alunos;
create policy "alunos_update_admin"
on public.alunos
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "alunos_delete_admin" on public.alunos;
create policy "alunos_delete_admin"
on public.alunos
for delete
to authenticated
using (public.is_admin());

revoke all on public.profiles from public, anon, authenticated;
revoke all on public.alunos from public, anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.alunos to authenticated;
revoke execute on function public.current_user_role() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon, authenticated;
revoke execute on function public.is_staff() from public, anon, authenticated;
revoke execute on function public.registrar_presenca() from public, anon, authenticated;
revoke execute on function public.atualizar_graduacao_aluno(uuid) from public, anon, authenticated;
revoke execute on function public.bootstrap_first_admin(text) from public, anon, authenticated;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.registrar_presenca() to authenticated;
grant execute on function public.atualizar_graduacao_aluno(uuid) to authenticated;

commit;
