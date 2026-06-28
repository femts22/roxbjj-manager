# Supabase local development

Use the Supabase CLI with Docker to run the database locally. The migration in `supabase/migrations` is the source of truth for local development and future deploys.

## Start local Supabase

1. Install the Supabase CLI and Docker Desktop.
2. Start the local stack:

```bash
npm run supabase:start
```

3. Apply the migrations:

```bash
npm run supabase:reset
```

4. Generate `apps/web/.env.local` for the local app:

```bash
npm run supabase:env
```

5. Start the web app:

```bash
npm run dev
```

The generated `.env.local` points `apps/web` at `http://127.0.0.1:54321`, so development does not depend on Supabase Cloud.

## First admin

1. Open the local Studio at the URL printed by `npm run supabase:start` or `npm run supabase:status`.
2. Create the first Auth user locally.
3. Open the SQL editor in the local Studio and run:

```sql
select public.bootstrap_first_admin('admin@example.com');
```

Replace the e-mail with the local user you created. The function refuses to run after an admin already exists.

## Verify security

Run these checks against the local database:

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
