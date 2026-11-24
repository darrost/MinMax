import { supabase } from './supabase';

const gameColumns = 'id, title, platform, status, notes';
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

export async function saveGame(userId, game, requestId) {
  const { data, error } = await supabase
    .from('games')
    .upsert(
      { ...game, user_id: userId, request_id: requestId },
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
