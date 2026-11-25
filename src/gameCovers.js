import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { supabase } from './supabase';

const bucket = 'game-covers';
const maxCoverBytes = 5 * 1024 * 1024;

export class CoverUploadError extends Error {}

export async function uploadGameCover(userId, requestId, uri) {
  let bytes;
  try {
    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      if (!response.ok) throw new Error('Photo unavailable.');
      bytes = await response.arrayBuffer();
    } else {
      bytes = await new File(uri).arrayBuffer();
    }
  } catch {
    throw new CoverUploadError('Could not read the cover photo. Choose it again.');
  }

  if (!bytes.byteLength || bytes.byteLength > maxCoverBytes) {
    throw new CoverUploadError('Choose a valid cover photo no larger than 5 MB.');
  }

  const path = `${userId}/${requestId}.jpg`;
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType: 'image/jpeg',
    // Retrying the same save can upload the same photo to the same path.
    upsert: true,
  });
  if (error) throw new CoverUploadError('Could not upload the cover photo. Check your connection and try again.');
  return path;
}

export async function loadGameCoverUrl(path) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
}

export async function removeUnusedGameCover(path) {
  if (!path) return;
  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) console.warn('Could not clean up an unused game cover.', error.message);
  } catch {
    console.warn('Could not clean up an unused game cover.');
  }
}
