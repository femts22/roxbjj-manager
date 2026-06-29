begin;

alter type public.app_role add value if not exists 'responsavel';

create or replace function public.is_responsavel()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role()::text = 'responsavel', false);
$$;

revoke execute on function public.is_responsavel() from public, anon, authenticated;
grant execute on function public.is_responsavel() to authenticated;

commit;
