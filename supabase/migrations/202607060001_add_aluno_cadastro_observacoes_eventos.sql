begin;

alter table public.alunos
  add column if not exists nome_social text,
  add column if not exists cpf text,
  add column if not exists rg text,
  add column if not exists whatsapp text,
  add column if not exists cep text,
  add column if not exists rua text,
  add column if not exists numero text,
  add column if not exists complemento text,
  add column if not exists bairro text,
  add column if not exists cidade text,
  add column if not exists estado text,
  add column if not exists contato_emergencia_nome text,
  add column if not exists contato_emergencia_telefone text,
  add column if not exists contato_emergencia_parentesco text,
  add column if not exists tipo_sanguineo text,
  add column if not exists alergias text,
  add column if not exists restricoes_medicas text,
  add column if not exists medicamentos_uso_continuo text,
  add column if not exists observacoes_medicas text,
  add column if not exists responsavel_principal_nome text,
  add column if not exists responsavel_principal_telefone text,
  add column if not exists responsavel_principal_whatsapp text,
  add column if not exists responsavel_principal_email text,
  add column if not exists responsavel_principal_parentesco text,
  add column if not exists cadastro_completo boolean not null default false,
  add column if not exists cadastro_atualizado_em timestamptz;

create or replace function public.aluno_cadastro_completo(aluno public.alunos)
returns boolean
language sql
stable
set search_path = public
as $$
  select
    nullif(trim(coalesce(aluno.nome, '')), '') is not null
    and (
      nullif(trim(coalesce(aluno.telefone, '')), '') is not null
      or nullif(trim(coalesce(aluno.whatsapp, '')), '') is not null
    )
    and aluno.data_nascimento is not null
    and nullif(trim(coalesce(aluno.contato_emergencia_nome, '')), '') is not null
    and nullif(trim(coalesce(aluno.contato_emergencia_telefone, '')), '') is not null
    and nullif(trim(coalesce(aluno.cep, '')), '') is not null
    and nullif(trim(coalesce(aluno.rua, '')), '') is not null
    and nullif(trim(coalesce(aluno.numero, '')), '') is not null
    and nullif(trim(coalesce(aluno.bairro, '')), '') is not null
    and nullif(trim(coalesce(aluno.cidade, '')), '') is not null
    and nullif(trim(coalesce(aluno.estado, '')), '') is not null;
$$;

create or replace function public.set_aluno_cadastro_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.cadastro_completo := public.aluno_cadastro_completo(new);

  if tg_op = 'INSERT'
    or new.nome is distinct from old.nome
    or new.nome_social is distinct from old.nome_social
    or new.cpf is distinct from old.cpf
    or new.rg is distinct from old.rg
    or new.telefone is distinct from old.telefone
    or new.whatsapp is distinct from old.whatsapp
    or new.email is distinct from old.email
    or new.data_nascimento is distinct from old.data_nascimento
    or new.cep is distinct from old.cep
    or new.rua is distinct from old.rua
    or new.numero is distinct from old.numero
    or new.complemento is distinct from old.complemento
    or new.bairro is distinct from old.bairro
    or new.cidade is distinct from old.cidade
    or new.estado is distinct from old.estado
    or new.contato_emergencia_nome is distinct from old.contato_emergencia_nome
    or new.contato_emergencia_telefone is distinct from old.contato_emergencia_telefone
    or new.contato_emergencia_parentesco is distinct from old.contato_emergencia_parentesco
    or new.tipo_sanguineo is distinct from old.tipo_sanguineo
    or new.alergias is distinct from old.alergias
    or new.restricoes_medicas is distinct from old.restricoes_medicas
    or new.medicamentos_uso_continuo is distinct from old.medicamentos_uso_continuo
    or new.observacoes_medicas is distinct from old.observacoes_medicas
    or new.responsavel_principal_nome is distinct from old.responsavel_principal_nome
    or new.responsavel_principal_telefone is distinct from old.responsavel_principal_telefone
    or new.responsavel_principal_whatsapp is distinct from old.responsavel_principal_whatsapp
    or new.responsavel_principal_email is distinct from old.responsavel_principal_email
    or new.responsavel_principal_parentesco is distinct from old.responsavel_principal_parentesco
    or new.observacoes is distinct from old.observacoes
  then
    new.cadastro_atualizado_em := now();
  end if;

  return new;
end;
$$;

drop trigger if exists set_aluno_cadastro_status on public.alunos;
create trigger set_aluno_cadastro_status
before insert or update on public.alunos
for each row execute function public.set_aluno_cadastro_status();

update public.alunos a
set cadastro_completo = public.aluno_cadastro_completo(a),
    cadastro_atualizado_em = coalesce(a.cadastro_atualizado_em, a.updated_at, a.created_at, now());

create table if not exists public.aluno_observacoes (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  autor_id uuid references auth.users(id) on delete set null,
  tipo text not null default 'geral' check (tipo in ('geral', 'financeiro', 'graduação', 'comportamento', 'saúde')),
  visibilidade text not null default 'interna' check (visibilidade in ('interna', 'aluno', 'responsavel')),
  conteudo text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists aluno_observacoes_aluno_created_at_idx
  on public.aluno_observacoes (aluno_id, created_at desc);

create table if not exists public.aluno_eventos (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  tipo text not null,
  titulo text not null,
  descricao text,
  criado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists aluno_eventos_aluno_created_at_idx
  on public.aluno_eventos (aluno_id, created_at desc);

drop trigger if exists set_aluno_observacoes_updated_at on public.aluno_observacoes;
create trigger set_aluno_observacoes_updated_at
before update on public.aluno_observacoes
for each row execute function public.set_updated_at();

alter table public.aluno_observacoes enable row level security;
alter table public.aluno_eventos enable row level security;

create or replace function public.atualizar_cadastro_aluno(
  p_nome text,
  p_nome_social text,
  p_cpf text,
  p_rg text,
  p_data_nascimento date,
  p_telefone text,
  p_whatsapp text,
  p_email text,
  p_cep text,
  p_rua text,
  p_numero text,
  p_complemento text,
  p_bairro text,
  p_cidade text,
  p_estado text,
  p_contato_emergencia_nome text,
  p_contato_emergencia_telefone text,
  p_contato_emergencia_parentesco text,
  p_tipo_sanguineo text,
  p_alergias text,
  p_restricoes_medicas text,
  p_medicamentos_uso_continuo text,
  p_observacoes_medicas text,
  p_responsavel_principal_nome text,
  p_responsavel_principal_telefone text,
  p_responsavel_principal_whatsapp text,
  p_responsavel_principal_email text,
  p_responsavel_principal_parentesco text,
  p_observacoes text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  alvo_aluno_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.';
  end if;

  select id into alvo_aluno_id
  from public.alunos
  where user_id = (select auth.uid())
  for update;

  if alvo_aluno_id is null then
    raise exception 'Aluno not found.';
  end if;

  update public.alunos
  set nome = nullif(trim(coalesce(p_nome, '')), ''),
      nome_social = nullif(trim(coalesce(p_nome_social, '')), ''),
      cpf = nullif(trim(coalesce(p_cpf, '')), ''),
      rg = nullif(trim(coalesce(p_rg, '')), ''),
      data_nascimento = p_data_nascimento,
      telefone = nullif(trim(coalesce(p_telefone, '')), ''),
      whatsapp = nullif(trim(coalesce(p_whatsapp, '')), ''),
      email = nullif(trim(coalesce(p_email, '')), ''),
      cep = nullif(trim(coalesce(p_cep, '')), ''),
      rua = nullif(trim(coalesce(p_rua, '')), ''),
      numero = nullif(trim(coalesce(p_numero, '')), ''),
      complemento = nullif(trim(coalesce(p_complemento, '')), ''),
      bairro = nullif(trim(coalesce(p_bairro, '')), ''),
      cidade = nullif(trim(coalesce(p_cidade, '')), ''),
      estado = upper(nullif(trim(coalesce(p_estado, '')), '')),
      contato_emergencia_nome = nullif(trim(coalesce(p_contato_emergencia_nome, '')), ''),
      contato_emergencia_telefone = nullif(trim(coalesce(p_contato_emergencia_telefone, '')), ''),
      contato_emergencia_parentesco = nullif(trim(coalesce(p_contato_emergencia_parentesco, '')), ''),
      tipo_sanguineo = nullif(trim(coalesce(p_tipo_sanguineo, '')), ''),
      alergias = nullif(trim(coalesce(p_alergias, '')), ''),
      restricoes_medicas = nullif(trim(coalesce(p_restricoes_medicas, '')), ''),
      medicamentos_uso_continuo = nullif(trim(coalesce(p_medicamentos_uso_continuo, '')), ''),
      observacoes_medicas = nullif(trim(coalesce(p_observacoes_medicas, '')), ''),
      responsavel_principal_nome = nullif(trim(coalesce(p_responsavel_principal_nome, '')), ''),
      responsavel_principal_telefone = nullif(trim(coalesce(p_responsavel_principal_telefone, '')), ''),
      responsavel_principal_whatsapp = nullif(trim(coalesce(p_responsavel_principal_whatsapp, '')), ''),
      responsavel_principal_email = nullif(trim(coalesce(p_responsavel_principal_email, '')), ''),
      responsavel_principal_parentesco = nullif(trim(coalesce(p_responsavel_principal_parentesco, '')), ''),
      observacoes = nullif(trim(coalesce(p_observacoes, '')), '')
  where id = alvo_aluno_id;

  insert into public.aluno_eventos (aluno_id, tipo, titulo, descricao, criado_por)
  values (alvo_aluno_id, 'cadastro', 'Cadastro atualizado', 'Cadastro completo atualizado pelo aluno.', (select auth.uid()));
end;
$$;
drop policy if exists "aluno_observacoes_select_by_visibility" on public.aluno_observacoes;
create policy "aluno_observacoes_select_by_visibility"
on public.aluno_observacoes
for select
to authenticated
using (
  public.is_staff()
  or (
    visibilidade = 'aluno'
    and exists (
      select 1 from public.alunos a
      where a.id = aluno_id
        and a.user_id = (select auth.uid())
    )
  )
  or (
    visibilidade = 'responsavel'
    and exists (
      select 1 from public.responsavel_alunos ra
      where ra.aluno_id = aluno_observacoes.aluno_id
        and ra.responsavel_id = (select auth.uid())
    )
  )
);

drop policy if exists "aluno_observacoes_insert_staff" on public.aluno_observacoes;
create policy "aluno_observacoes_insert_staff"
on public.aluno_observacoes
for insert
to authenticated
with check (public.is_staff() and autor_id = (select auth.uid()));

drop policy if exists "aluno_observacoes_update_admin" on public.aluno_observacoes;
create policy "aluno_observacoes_update_admin"
on public.aluno_observacoes
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "aluno_eventos_select_own_or_staff_or_responsavel" on public.aluno_eventos;
create policy "aluno_eventos_select_own_or_staff_or_responsavel"
on public.aluno_eventos
for select
to authenticated
using (
  public.is_staff()
  or exists (
    select 1 from public.alunos a
    where a.id = aluno_id
      and a.user_id = (select auth.uid())
  )
  or exists (
    select 1 from public.responsavel_alunos ra
    where ra.aluno_id = aluno_eventos.aluno_id
      and ra.responsavel_id = (select auth.uid())
  )
);

drop policy if exists "aluno_eventos_insert_staff" on public.aluno_eventos;
create policy "aluno_eventos_insert_staff"
on public.aluno_eventos
for insert
to authenticated
with check (public.is_staff());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  signup_origin text;
  aluno_nome text;
  aluno_telefone text;
  aluno_data_nascimento date;
  aluno_dia_vencimento_pagamento integer;
  aluno_observacoes text;
begin
  signup_origin := new.raw_user_meta_data ->> 'signup_origin';
  aluno_nome := nullif(trim(coalesce(new.raw_user_meta_data ->> 'nome', '')), '');
  aluno_telefone := nullif(trim(coalesce(new.raw_user_meta_data ->> 'telefone', '')), '');
  aluno_observacoes := nullif(trim(coalesce(new.raw_user_meta_data ->> 'observacoes', '')), '');

  begin
    aluno_data_nascimento := nullif(new.raw_user_meta_data ->> 'data_nascimento', '')::date;
  exception when others then
    aluno_data_nascimento := null;
  end;

  begin
    aluno_dia_vencimento_pagamento := coalesce(nullif(new.raw_user_meta_data ->> 'dia_vencimento_pagamento', '')::integer, 10);
  exception when others then
    aluno_dia_vencimento_pagamento := 10;
  end;

  if aluno_dia_vencimento_pagamento not between 1 and 31 then
    aluno_dia_vencimento_pagamento := 10;
  end if;

  insert into public.profiles (id, email, role)
  values (new.id, coalesce(new.email, ''), 'aluno')
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();

  if signup_origin = 'public_aluno' then
    insert into public.alunos (
      user_id,
      nome,
      email,
      telefone,
      data_nascimento,
      observacoes,
      faixa,
      grau,
      pago,
      vencimento,
      dia_vencimento_pagamento,
      presencas
    )
    values (
      new.id,
      coalesce(aluno_nome, coalesce(new.email, 'Aluno')),
      coalesce(new.email, ''),
      aluno_telefone,
      aluno_data_nascimento,
      aluno_observacoes,
      'branca',
      0,
      false,
      aluno_dia_vencimento_pagamento,
      aluno_dia_vencimento_pagamento,
      0
    )
    on conflict (user_id) do update
      set nome = excluded.nome,
          email = excluded.email,
          telefone = excluded.telefone,
          data_nascimento = excluded.data_nascimento,
          observacoes = excluded.observacoes,
          updated_at = now();

    insert into public.aluno_eventos (aluno_id, tipo, titulo, descricao, criado_por)
    select a.id, 'cadastro', 'Cadastro criado', 'Cadastro público criado pelo aluno.', new.id
    from public.alunos a
    where a.user_id = new.id
    on conflict do nothing;
  end if;

  return new;
end;
$$;

revoke all on public.aluno_observacoes from public, anon, authenticated;
revoke all on public.aluno_eventos from public, anon, authenticated;
grant select, insert, update on public.aluno_observacoes to authenticated;
grant select, insert on public.aluno_eventos to authenticated;

revoke execute on function public.aluno_cadastro_completo(public.alunos) from public, anon, authenticated;
revoke execute on function public.set_aluno_cadastro_status() from public, anon, authenticated;
grant execute on function public.aluno_cadastro_completo(public.alunos) to authenticated;
revoke execute on function public.atualizar_cadastro_aluno(text, text, text, text, date, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.atualizar_cadastro_aluno(text, text, text, text, date, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text) to authenticated;

commit;