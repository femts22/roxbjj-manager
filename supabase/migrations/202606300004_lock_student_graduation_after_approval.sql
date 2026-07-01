begin;

alter table public.alunos
  add column if not exists graduacao_aprovada boolean not null default false;

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
      graus = solicitacao.graus,
      graduacao_aprovada = true
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
      graus = case when grau >= 4 then 0 else grau + 1 end,
      graduacao_aprovada = true
  where id = p_aluno_id;

  if not found then
    raise exception 'Aluno not found.';
  end if;
end;
$$;

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
      and a.graduacao_aprovada = false
  )
);

commit;
