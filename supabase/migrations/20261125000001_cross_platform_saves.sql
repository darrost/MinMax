begin;

alter table public.games
  add column cross_save boolean not null default false,
  add column extra_platforms text[] not null default '{}',
  add constraint valid_extra_platforms check (
    (cross_save or cardinality(extra_platforms) = 0)
    and cardinality(extra_platforms) <= 5
    and extra_platforms <@ array['PC', 'PlayStation', 'Xbox', 'Nintendo', 'Mobile', 'Other']
    and not (platform = any(extra_platforms))
  );

grant update (cross_save, extra_platforms) on public.games to authenticated;

commit;
