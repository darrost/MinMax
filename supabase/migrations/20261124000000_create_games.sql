begin;

create table public.games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  request_id text not null check (char_length(request_id) between 1 and 80),
  title text not null check (char_length(btrim(title)) between 2 and 100),
  platform text not null check (platform in ('PC', 'PlayStation', 'Xbox', 'Nintendo', 'Mobile', 'Other')),
  status text not null check (status in ('Want to play', 'Playing', 'Paused', 'Finished')),
  notes text not null default '' check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  unique (user_id, request_id)
);

create index games_library_order_idx on public.games (user_id, created_at desc, id desc);

alter table public.games enable row level security;
revoke all privileges on public.games from public, anon, authenticated;
grant select, insert on public.games to authenticated;

create policy "Users can read their own games"
  on public.games for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can add their own games"
  on public.games for insert to authenticated
  with check (user_id = (select auth.uid()));

commit;
