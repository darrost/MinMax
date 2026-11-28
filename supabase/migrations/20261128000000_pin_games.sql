begin;

alter table public.games add column is_pinned boolean not null default false;
grant update (is_pinned) on public.games to authenticated;

commit;
