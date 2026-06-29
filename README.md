# ROXBJJ PLANALTO

Aplicação Next.js com Supabase para gestão da academia.

## Desenvolvimento local

1. Inicie o Supabase local:

```bash
npm run supabase:start
```

2. Aplique as migrations:

```bash
npm run supabase:reset
```

3. Gere `apps/web/.env.local` para apontar o app para o Supabase local:

```bash
npm run supabase:env
```

4. Suba o app:

```bash
npm run dev
```

O arquivo gerado usa `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`, então o desenvolvimento não depende do Supabase Cloud.

## Primeiro admin

Depois de criar o primeiro usuário Auth no Studio local, rode:

```sql
select public.bootstrap_first_admin('admin@example.com');
```

Mais detalhes em [`supabase/README.md`](./supabase/README.md).

## Deploy

O deploy futuro na Vercel continua usando as mesmas variáveis:

```env
NEXT_PUBLIC_SUPABASE_URL=<url do projeto Supabase>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key do projeto>
```

## Scripts

- `npm run supabase:start`
- `npm run supabase:stop`
- `npm run supabase:reset`
- `npm run supabase:status`
- `npm run supabase:env`
