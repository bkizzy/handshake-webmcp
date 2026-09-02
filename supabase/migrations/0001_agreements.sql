create table if not exists public.agreements (
  id uuid primary key,
  owner_user_id uuid references auth.users(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agreements_owner_user_id_idx on public.agreements(owner_user_id);

alter table public.agreements enable row level security;

-- The application server uses the Supabase secret key. No browser client is
-- granted direct table access; access links are validated by server routes.
