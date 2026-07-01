begin;

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
  end if;

  return new;
end;
$$;

commit;
