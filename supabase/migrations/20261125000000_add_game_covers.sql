begin;

alter table public.games
  add column cover_path text unique,
  add constraint game_cover_in_owner_folder check (
    cover_path is null or (
      split_part(cover_path, '/', 1) = user_id::text and
      cover_path ~ '^[0-9a-f-]+/[0-9a-z-]+[.]jpg$'
    )
  );

grant update (cover_path) on public.games to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('game-covers', 'game-covers', false, 5242880, array['image/jpeg']);

create policy "Users can read their game covers"
  on storage.objects for select to authenticated
  using (bucket_id = 'game-covers' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users can upload their game covers"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'game-covers' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users can retry uploading their game covers"
  on storage.objects for update to authenticated
  using (bucket_id = 'game-covers' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'game-covers' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users can delete their unused game covers"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'game-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not exists (select 1 from public.games where cover_path = storage.objects.name)
  );

commit;
