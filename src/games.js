import { removeUnusedGameCover, uploadGameCover } from './gameCovers';
import { supabase } from './supabase';

const gameColumns = 'id, title, platform, extra_platforms, cross_save, status, notes, cover_path';
const pageSize = 100;

export async function loadGames(userId, signal) {
  const games = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('games')
      .select(gameColumns)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + pageSize - 1)
      .abortSignal(signal);

    if (error) throw error;
    games.push(...data);
    if (data.length < pageSize) return games;

    offset += pageSize;
  }
}

export async function saveGame(userId, game, requestId, coverUri) {
  const coverPath = coverUri ? await uploadGameCover(userId, requestId, coverUri) : null;
  const { data, error } = await supabase
    .from('games')
    .upsert(
      { ...game, user_id: userId, request_id: requestId, cover_path: coverPath },
      { onConflict: 'user_id,request_id', ignoreDuplicates: true },
    )
    .select(gameColumns)
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  const existing = await supabase
    .from('games')
    .select(gameColumns)
    .eq('user_id', userId)
    .eq('request_id', requestId)
    .single();

  if (existing.error) throw existing.error;
  return existing.data;
}

export async function updateGame(userId, gameId, { title, platform, extra_platforms, cross_save, status, notes }, requestId, coverChange) {
  const changes = { title, platform, extra_platforms, cross_save, status, notes };
  let previousCoverPath;

  if (coverChange !== undefined) {
    const current = await supabase
      .from('games')
      .select('cover_path')
      .eq('id', gameId)
      .eq('user_id', userId)
      .single();
    if (current.error) throw current.error;

    previousCoverPath = current.data.cover_path;
    changes.cover_path = coverChange ? await uploadGameCover(userId, requestId, coverChange) : null;
  }

  let query = supabase
    .from('games')
    .update(changes)
    .eq('id', gameId)
    .eq('user_id', userId);

  // A concurrent replacement may change which file belongs to the game.
  if (previousCoverPath === null) {
    query = query.is('cover_path', null);
  } else if (previousCoverPath !== undefined) {
    query = query.eq('cover_path', previousCoverPath);
  }

  const { data, error } = await query.select(gameColumns).single();
  if (error) throw error;
  if (previousCoverPath && previousCoverPath !== data.cover_path) {
    void removeUnusedGameCover(previousCoverPath);
  }
  return data;
}

export async function deleteGame(userId, gameId) {
  const { data, error } = await supabase
    .from('games')
    .delete()
    .eq('id', gameId)
    .eq('user_id', userId)
    .select('cover_path')
    .single();

  if (error) throw error;
  void removeUnusedGameCover(data.cover_path);
}
