begin;

alter table public.alunos
  add column if not exists categoria text not null default 'adulto',
  add column if not exists graus integer not null default 0;

update public.alunos
set graus = grau
where graus is distinct from grau;

alter table public.alunos
  drop constraint if exists alunos_faixa_check;

alter table public.alunos
  add constraint alunos_faixa_check check (faixa in (
    'branca',
    'cinza/branca',
    'cinza',
    'cinza/preta',
    'amarela/branca',
    'amarela',
    'amarela/preta',
    'laranja/branca',
    'laranja',
    'laranja/preta',
    'verde/branca',
    'verde',
    'verde/preta',
    'azul',
    'roxa',
    'marrom',
    'preta'
  ));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'alunos_categoria_check'
      and conrelid = 'public.alunos'::regclass
  ) then
    alter table public.alunos
      add constraint alunos_categoria_check check (categoria in ('infantil', 'juvenil', 'adulto'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'alunos_graus_check'
      and conrelid = 'public.alunos'::regclass
  ) then
    alter table public.alunos
      add constraint alunos_graus_check check (graus between 0 and 4);
  end if;
end $$;

create table if not exists public.graduacao_solicitacoes (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  categoria text not null check (categoria in ('infantil', 'juvenil', 'adulto')),
  faixa text not null,
  graus integer not null check (graus between 0 and 4),
  data_ultima_graduacao date,
  academia_origem text,
  professor_graduador text,
  observacoes text,
  status text not null default 'pendente' check (status in ('pendente', 'aprovada', 'recusada')),
  analisado_por uuid references auth.users(id) on delete set null,
  analisado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint graduacao_solicitacoes_faixa_categoria_check check (
    (categoria = 'infantil' and faixa in (
      'branca',
      'cinza/branca',
      'cinza',
      'cinza/preta',
      'amarela/branca',
      'amarela',
      'amarela/preta',
      'laranja/branca',
      'laranja',
      'laranja/preta',
      'verde/branca',
      'verde',
      'verde/preta'
    ))
    or (categoria = 'juvenil' and faixa in ('branca', 'azul', 'roxa'))
    or (categoria = 'adulto' and faixa in ('branca', 'azul', 'roxa', 'marrom', 'preta'))
  )
);

create unique index if not exists graduacao_solicitacoes_um_pendente_por_aluno
  on public.graduacao_solicitacoes (aluno_id)
  where status = 'pendente';

create index if not exists graduacao_solicitacoes_status_created_at_idx
  on public.graduacao_solicitacoes (status, created_at desc);

create table if not exists public.graduacao_historico (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  solicitacao_id uuid references public.graduacao_solicitacoes(id) on delete set null,
  categoria text not null check (categoria in ('infantil', 'juvenil', 'adulto')),
  faixa text not null,
  graus integer not null check (graus between 0 and 4),
  data_graduacao date,
  origem text not null default 'solicitacao_aprovada' check (origem in ('solicitacao_aprovada', 'admin')),
  aprovado_por uuid references auth.users(id) on delete set null,
  observacoes text,
  created_at timestamptz not null default now()
);

drop trigger if exists set_graduacao_solicitacoes_updated_at on public.graduacao_solicitacoes;
create trigger set_graduacao_solicitacoes_updated_at
before update on public.graduacao_solicitacoes
for each row execute function public.set_updated_at();

create or replace function public.aprovar_graduacao_solicitacao(p_solicitacao_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  solicitacao public.graduacao_solicitacoes%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Not authorized.';
  end if;

  select * into solicitacao
  from public.graduacao_solicitacoes
  where id = p_solicitacao_id
    and status = 'pendente'
  for update;

  if not found then
    raise exception 'Solicitacao not found.';
  end if;

  update public.alunos
  set categoria = solicitacao.categoria,
      faixa = solicitacao.faixa,
      grau = solicitacao.graus,
      graus = solicitacao.graus
  where id = solicitacao.aluno_id;

  update public.graduacao_solicitacoes
  set status = 'aprovada',
      analisado_por = (select auth.uid()),
      analisado_em = now()
  where id = solicitacao.id;

  insert into public.graduacao_historico (
    aluno_id,
    solicitacao_id,
    categoria,
    faixa,
    graus,
    data_graduacao,
    origem,
    aprovado_por,
    observacoes
  )
  values (
    solicitacao.aluno_id,
    solicitacao.id,
    solicitacao.categoria,
    solicitacao.faixa,
    solicitacao.graus,
    solicitacao.data_ultima_graduacao,
    'solicitacao_aprovada',
    (select auth.uid()),
    solicitacao.observacoes
  );
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
  set grau = case when grau >= 4 then 0 else grau + 1 end,
      graus = case when grau >= 4 then 0 else grau + 1 end
  where id = p_aluno_id;

  if not found then
    raise exception 'Aluno not found.';
  end if;
end;
$$;

create or replace function public.recusar_graduacao_solicitacao(p_solicitacao_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized.';
  end if;

  update public.graduacao_solicitacoes
  set status = 'recusada',
      analisado_por = (select auth.uid()),
      analisado_em = now()
  where id = p_solicitacao_id
    and status = 'pendente';

  if not found then
    raise exception 'Solicitacao not found.';
  end if;
end;
$$;

alter table public.graduacao_solicitacoes enable row level security;
alter table public.graduacao_historico enable row level security;

drop policy if exists "graduacao_solicitacoes_select_own_or_staff" on public.graduacao_solicitacoes;
create policy "graduacao_solicitacoes_select_own_or_staff"
on public.graduacao_solicitacoes
for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.is_staff()
);

drop policy if exists "graduacao_solicitacoes_insert_own" on public.graduacao_solicitacoes;
create policy "graduacao_solicitacoes_insert_own"
on public.graduacao_solicitacoes
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.alunos a
    where a.id = aluno_id
      and a.user_id = (select auth.uid())
  )
);

drop policy if exists "graduacao_solicitacoes_update_admin" on public.graduacao_solicitacoes;
create policy "graduacao_solicitacoes_update_admin"
on public.graduacao_solicitacoes
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "graduacao_historico_select_own_or_staff" on public.graduacao_historico;
create policy "graduacao_historico_select_own_or_staff"
on public.graduacao_historico
for select
to authenticated
using (
  public.is_staff()
  or exists (
    select 1
    from public.alunos a
    where a.id = aluno_id
      and a.user_id = (select auth.uid())
  )
);

drop policy if exists "graduacao_historico_insert_admin" on public.graduacao_historico;
create policy "graduacao_historico_insert_admin"
on public.graduacao_historico
for insert
to authenticated
with check (public.is_admin());

revoke all on public.graduacao_solicitacoes from public, anon, authenticated;
revoke all on public.graduacao_historico from public, anon, authenticated;
grant select, insert, update on public.graduacao_solicitacoes to authenticated;
grant select, insert on public.graduacao_historico to authenticated;

revoke execute on function public.aprovar_graduacao_solicitacao(uuid) from public, anon, authenticated;
revoke execute on function public.recusar_graduacao_solicitacao(uuid) from public, anon, authenticated;
grant execute on function public.aprovar_graduacao_solicitacao(uuid) to authenticated;
grant execute on function public.recusar_graduacao_solicitacao(uuid) to authenticated;

commit;
