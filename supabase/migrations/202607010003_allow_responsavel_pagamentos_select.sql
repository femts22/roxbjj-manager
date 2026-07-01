begin;

drop policy if exists "pagamentos_select_own_or_staff" on public.pagamentos;
drop policy if exists "pagamentos_select_own_staff_or_responsavel" on public.pagamentos;
create policy "pagamentos_select_own_staff_or_responsavel"
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
  or exists (
    select 1
    from public.responsavel_alunos ra
    where ra.aluno_id = pagamentos.aluno_id
      and ra.responsavel_id = (select auth.uid())
  )
);

commit;
