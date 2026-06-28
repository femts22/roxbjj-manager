# Supabase security setup

Apply migrations in `supabase/migrations` before deploying the web app.

## First admin

1. Create the first user in Supabase Auth.
2. Run this once in the SQL editor, replacing the e-mail:

```sql
select public.bootstrap_first_admin('admin@example.com');
```

The function refuses to run after an admin already exists.

## RLS checks

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('profiles', 'alunos');

select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'alunos')
order by tablename, policyname;
```

Expected behavior:

- `anon` cannot read or write `profiles` or `alunos`.
- `aluno` can read only their own `alunos` row and can call `registrar_presenca()`.
- `aluno` cannot insert, update, or delete rows in `alunos` directly.
- `professor` can read all `alunos` and call `atualizar_graduacao_aluno(uuid)`.
- `admin` has full CRUD on `alunos` and can update `profiles`.
