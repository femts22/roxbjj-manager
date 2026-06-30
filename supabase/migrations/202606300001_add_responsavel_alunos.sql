begin;

create table if not exists public.responsavel_alunos (
  responsavel_id uuid not null references auth.users(id) on delete cascade,
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (responsavel_id, aluno_id)
);

create index if not exists responsavel_alunos_aluno_id_idx
  on public.responsavel_alunos (aluno_id);

alter table public.responsavel_alunos enable row level security;

drop policy if exists "responsavel_alunos_select_own_or_admin" on public.responsavel_alunos;
create policy "responsavel_alunos_select_own_or_admin"
on public.responsavel_alunos
for select
to authenticated
using (
  responsavel_id = (select auth.uid())
  or public.is_admin()
);

drop policy if exists "responsavel_alunos_insert_admin" on public.responsavel_alunos;
create policy "responsavel_alunos_insert_admin"
on public.responsavel_alunos
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "responsavel_alunos_delete_admin" on public.responsavel_alunos;
create policy "responsavel_alunos_delete_admin"
on public.responsavel_alunos
for delete
to authenticated
using (public.is_admin());

drop policy if exists "alunos_select_own_or_staff" on public.alunos;
drop policy if exists "alunos_select_own_staff_or_responsavel" on public.alunos;
create policy "alunos_select_own_staff_or_responsavel"
on public.alunos
for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.is_staff()
  or exists (
    select 1
    from public.responsavel_alunos ra
    where ra.aluno_id = alunos.id
      and ra.responsavel_id = (select auth.uid())
  )
);

revoke all on public.responsavel_alunos from public, anon, authenticated;
grant select, insert, delete on public.responsavel_alunos to authenticated;

commit;
