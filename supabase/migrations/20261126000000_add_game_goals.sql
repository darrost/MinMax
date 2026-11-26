begin;

create table public.game_goals (
  game_id uuid not null references public.games(id) on delete cascade,
  id text not null check (char_length(id) between 1 and 80),
  title text not null check (char_length(btrim(title)) between 1 and 100),
  requirement text not null default '' check (char_length(requirement) <= 500),
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (game_id, id)
);

alter table public.game_goals enable row level security;
revoke all on public.game_goals from public, anon, authenticated;
grant select, insert, delete on public.game_goals to authenticated;
grant update (completed) on public.game_goals to authenticated;
create policy "Manage goals for owned games"
  on public.game_goals for all to authenticated
  using (exists (select 1 from public.games g where g.id = game_id and g.user_id = (select auth.uid())))
  with check (exists (select 1 from public.games g where g.id = game_id and g.user_id = (select auth.uid())));

commit;
