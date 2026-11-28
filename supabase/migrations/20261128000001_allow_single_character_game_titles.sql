alter table public.games
  drop constraint games_title_check,
  add constraint games_title_check check (
    char_length(btrim(title)) between 1 and 100 and title ~ '[^[:space:]]'
  );
