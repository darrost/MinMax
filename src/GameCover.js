import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { OutlineButton } from './LibraryControls';
import { loadGameCoverUrl } from './gameCovers';

export default function GameCover({ path, localUri, thumbnail = false, hero = false }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!path) return;
    let active = true;

    loadGameCoverUrl(path).then(
      (signedUrl) => { if (active) setUrl(signedUrl); },
      () => { if (active) setFailed(true); },
    );
    return () => { active = false; };
  }, [path, attempt]);

  if (failed) {
    if (thumbnail) return null;
    return (
      <View>
        <Text style={{ color: '#ffb3c3' }} accessibilityRole="alert">Could not display the cover photo.</Text>
        {path && (
          <OutlineButton
            title="Retry cover"
            onPress={() => {
              setUrl(null);
              setFailed(false);
              setAttempt((current) => current + 1);
            }}
          />
        )}
      </View>
    );
  }

  const uri = localUri ?? url;
  if (!uri) {
    if (thumbnail) return <View style={styles.artwork} />;
    return <ActivityIndicator accessibilityLabel="Loading cover photo" />;
  }

  const photo = (
    <Image
      accessibilityLabel={thumbnail ? undefined : 'Game cover photo'}
      accessible={!thumbnail}
      source={{ uri }}
      resizeMode={thumbnail || hero ? 'cover' : 'contain'}
      onError={() => setFailed(true)}
      style={thumbnail ? styles.thumbnail : hero ? styles.hero : styles.cover}
    />
  );

  if (!thumbnail) return photo;
  return (
    <>
      <Image
        accessible={false}
        pointerEvents="none"
        source={{ uri }}
        resizeMode="cover"
        blurRadius={22}
        style={styles.rowTint}
      />
      <View style={styles.artwork}>
        {photo}
        <View pointerEvents="none" style={styles.fade} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  rowTint: {
    ...StyleSheet.absoluteFill,
    opacity: 0.26,
  },
  artwork: { width: '36%', alignSelf: 'stretch' },
  fade: {
    ...StyleSheet.absoluteFill,
    backgroundImage: 'linear-gradient(90deg, transparent 68%, rgba(23,31,74,0.85) 100%)',
  },
  thumbnail: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#101737',
  },
  hero: { width: '100%', aspectRatio: 2.1, borderRadius: 16, backgroundColor: '#171f4a' },
  cover: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#171f4a',
  },
});
