import { useEffect, useState } from 'react';
import { ActivityIndicator, Button, Image, StyleSheet, Text, View } from 'react-native';
import { loadGameCoverUrl } from './gameCovers';

export default function GameCover({ path, localUri, thumbnail = false }) {
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
        <Text accessibilityRole="alert">Could not display the cover photo.</Text>
        {path && (
          <Button
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
    if (thumbnail) return <View style={styles.thumbnail} />;
    return <ActivityIndicator accessibilityLabel="Loading cover photo" />;
  }

  const photo = (
    <Image
      accessibilityLabel={thumbnail ? undefined : 'Game cover photo'}
      accessible={!thumbnail}
      source={{ uri }}
      resizeMode={thumbnail ? 'cover' : 'contain'}
      onError={() => setFailed(true)}
      style={thumbnail ? styles.thumbnail : styles.cover}
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
      {photo}
    </>
  );
}

const styles = StyleSheet.create({
  rowTint: {
    ...StyleSheet.absoluteFill,
    opacity: 0.13,
  },
  thumbnail: {
    width: 88,
    height: 64,
    borderRadius: 6,
    backgroundColor: '#edf1f6',
  },
  cover: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#edf1f6',
  },
});
