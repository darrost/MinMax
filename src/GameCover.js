import { useEffect, useState } from 'react';
import { ActivityIndicator, Button, Image, StyleSheet, Text, View } from 'react-native';
import { loadGameCoverUrl } from './gameCovers';

export default function GameCover({ path, localUri }) {
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
  if (!uri) return <ActivityIndicator accessibilityLabel="Loading cover photo" />;

  return (
    <Image
      accessibilityLabel="Game cover photo"
      accessible
      source={{ uri }}
      resizeMode="contain"
      onError={() => setFailed(true)}
      style={styles.cover}
    />
  );
}

const styles = StyleSheet.create({
  cover: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#edf1f6',
  },
});
