begin;

grant update (title, platform, status, notes) on public.games to authenticated;
grant delete on public.games to authenticated;

create policy "Users can update their own games"
  on public.games for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete their own games"
  on public.games for delete to authenticated
  using (user_id = (select auth.uid()));

commit;
