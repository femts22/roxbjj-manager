begin;

alter table public.alunos
  add column if not exists dia_vencimento_pagamento integer;

update public.alunos
set dia_vencimento_pagamento = vencimento
where dia_vencimento_pagamento is null;

alter table public.alunos
  alter column dia_vencimento_pagamento set default 10,
  alter column dia_vencimento_pagamento set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'alunos_dia_vencimento_pagamento_check'
      and conrelid = 'public.alunos'::regclass
  ) then
    alter table public.alunos
      add constraint alunos_dia_vencimento_pagamento_check check (dia_vencimento_pagamento between 1 and 31);
  end if;
end $$;

create table if not exists public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  valor numeric(10,2),
  data_vencimento date not null,
  data_pagamento date,
  status text not null default 'aberto' check (status in ('aberto', 'pago', 'vencido', 'cancelado')),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pagamentos_aluno_vencimento_idx
  on public.pagamentos (aluno_id, data_vencimento desc);

create index if not exists pagamentos_status_vencimento_idx
  on public.pagamentos (status, data_vencimento);

create table if not exists public.pagamento_vencimento_solicitacoes (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  dia_atual integer not null check (dia_atual between 1 and 31),
  dia_solicitado integer not null check (dia_solicitado between 1 and 31),
  motivo text,
  status text not null default 'pendente' check (status in ('pendente', 'aprovada', 'recusada')),
  analisado_por uuid references auth.users(id) on delete set null,
  analisado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists pagamento_vencimento_solicitacoes_um_pedido_por_aluno
  on public.pagamento_vencimento_solicitacoes (aluno_id);

create index if not exists pagamento_vencimento_solicitacoes_status_created_at_idx
  on public.pagamento_vencimento_solicitacoes (status, created_at);

drop trigger if exists set_pagamentos_updated_at on public.pagamentos;
create trigger set_pagamentos_updated_at
before update on public.pagamentos
for each row execute function public.set_updated_at();

drop trigger if exists set_pagamento_vencimento_solicitacoes_updated_at on public.pagamento_vencimento_solicitacoes;
create trigger set_pagamento_vencimento_solicitacoes_updated_at
before update on public.pagamento_vencimento_solicitacoes
for each row execute function public.set_updated_at();

create or replace function public.aprovar_pagamento_vencimento_solicitacao(p_solicitacao_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  solicitacao public.pagamento_vencimento_solicitacoes%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Not authorized.';
  end if;

  select * into solicitacao
  from public.pagamento_vencimento_solicitacoes
  where id = p_solicitacao_id
    and status = 'pendente'
  for update;

  if not found then
    raise exception 'Solicitacao not found.';
  end if;

  update public.alunos
  set dia_vencimento_pagamento = solicitacao.dia_solicitado,
      vencimento = solicitacao.dia_solicitado
  where id = solicitacao.aluno_id;

  update public.pagamento_vencimento_solicitacoes
  set status = 'aprovada',
      analisado_por = (select auth.uid()),
      analisado_em = now()
  where id = solicitacao.id;
end;
$$;

create or replace function public.recusar_pagamento_vencimento_solicitacao(p_solicitacao_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized.';
  end if;

  update public.pagamento_vencimento_solicitacoes
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

alter table public.pagamentos enable row level security;
alter table public.pagamento_vencimento_solicitacoes enable row level security;

drop policy if exists "pagamentos_select_own_or_staff" on public.pagamentos;
create policy "pagamentos_select_own_or_staff"
on public.pagamentos
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

drop policy if exists "pagamentos_insert_admin" on public.pagamentos;
create policy "pagamentos_insert_admin"
on public.pagamentos
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "pagamentos_update_admin" on public.pagamentos;
create policy "pagamentos_update_admin"
on public.pagamentos
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "pagamentos_delete_admin" on public.pagamentos;
create policy "pagamentos_delete_admin"
on public.pagamentos
for delete
to authenticated
using (public.is_admin());

drop policy if exists "pagamento_vencimento_solicitacoes_select_own_or_staff" on public.pagamento_vencimento_solicitacoes;
create policy "pagamento_vencimento_solicitacoes_select_own_or_staff"
on public.pagamento_vencimento_solicitacoes
for select
to authenticated
using (
  public.is_staff()
  or user_id = (select auth.uid())
);

drop policy if exists "pagamento_vencimento_solicitacoes_insert_own_once" on public.pagamento_vencimento_solicitacoes;
create policy "pagamento_vencimento_solicitacoes_insert_own_once"
on public.pagamento_vencimento_solicitacoes
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

drop policy if exists "pagamento_vencimento_solicitacoes_update_admin" on public.pagamento_vencimento_solicitacoes;
create policy "pagamento_vencimento_solicitacoes_update_admin"
on public.pagamento_vencimento_solicitacoes
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

revoke all on public.pagamentos from public, anon, authenticated;
revoke all on public.pagamento_vencimento_solicitacoes from public, anon, authenticated;
grant select, insert, update, delete on public.pagamentos to authenticated;
grant select, insert, update on public.pagamento_vencimento_solicitacoes to authenticated;

revoke execute on function public.aprovar_pagamento_vencimento_solicitacao(uuid) from public, anon, authenticated;
revoke execute on function public.recusar_pagamento_vencimento_solicitacao(uuid) from public, anon, authenticated;
grant execute on function public.aprovar_pagamento_vencimento_solicitacao(uuid) to authenticated;
grant execute on function public.recusar_pagamento_vencimento_solicitacao(uuid) to authenticated;

commit;
