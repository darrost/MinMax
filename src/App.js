import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, AppState, Button, FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AddGameScreen from './AddGameScreen';
import AuthScreen from './AuthScreen';
import { loadGames, saveGame } from './games';
import { supabase } from './supabase';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const LibraryContext = createContext(null);

function LibraryScreen({ navigation }) {
  const { games, loading, loadError, refresh } = useContext(LibraryContext);

  return (
    <FlatList
      data={games}
      keyExtractor={(game) => game.id}
      contentContainerStyle={styles.content}
      refreshing={loading}
      onRefresh={refresh}
      ListHeaderComponent={
        <View style={styles.libraryHeader}>
          <Button title="Add game" onPress={() => navigation.navigate('AddGame')} />
          {loadError && (
            <View>
              <Text accessibilityRole="alert">Could not load your games.</Text>
              <Button title="Try again" onPress={refresh} />
            </View>
          )}
        </View>
      }
      ListEmptyComponent={
        !loading && !loadError ? <Text>Add your first game to start your library.</Text> : null
      }
      renderItem={({ item }) => (
        <Button
          title={item.title}
          onPress={() => navigation.navigate('GameDetails', { gameId: item.id })}
        />
      )}
    />
  );
}

function GameDetailsScreen({ route }) {
  const { games } = useContext(LibraryContext);
  const game = games.find(({ id }) => id === route.params?.gameId);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {game ? (
        <>
          <Text accessibilityRole="header" style={styles.heading}>{game.title}</Text>
          <Text>Platform: {game.platform}</Text>
          {game.status && <Text>Status: {game.status}</Text>}
          {game.notes && (
            <View>
              <Text style={styles.noteLabel}>Where I left off</Text>
              <Text>{game.notes}</Text>
            </View>
          )}
        </>
      ) : (
        <Text>Game unavailable.</Text>
      )}
    </ScrollView>
  );
}

function AboutScreen({ email }) {
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');

  async function signOut() {
    setSigningOut(true);
    setError('');

    try {
      const result = await supabase.auth.signOut({ scope: 'local' });
      if (result.error) throw result.error;
    } catch (requestError) {
      setError(requestError.message || 'Could not sign out. Try again.');
      setSigningOut(false);
    }
  }

  return (
    <View style={styles.content}>
      <Text accessibilityRole="header" style={styles.heading}>MinMax</Text>
      <Text>Track your game backlog, save where you left off, and plan your next run.</Text>
      <Text>Signed in as {email}</Text>
      {error !== '' && <Text accessibilityRole="alert">{error}</Text>}
      <Button title={signingOut ? 'Signing out…' : 'Sign out'} onPress={signOut} disabled={signingOut} />
    </View>
  );
}

function AddGameRoute({ navigation }) {
  const { addGame } = useContext(LibraryContext);

  return <AddGameScreen navigation={navigation} onSave={addGame} />;
}

function LibraryNavigator({ userId }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const loadRequest = useRef(null);

  const refresh = useCallback(async () => {
    loadRequest.current?.controller.abort();
    const request = { controller: new AbortController(), savedGames: new Map() };
    loadRequest.current = request;
    setLoading(true);
    setLoadError(false);

    try {
      const results = await loadGames(userId, request.controller.signal);
      if (loadRequest.current === request) {
        // A save can finish after this request has already read the library.
        const gamesById = new Map(request.savedGames);
        for (const game of results) gamesById.set(game.id, game);
        setGames([...gamesById.values()]);
      }
    } catch {
      if (loadRequest.current === request) setLoadError(true);
    } finally {
      if (loadRequest.current === request) {
        loadRequest.current = null;
        setLoading(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
    return () => {
      loadRequest.current?.controller.abort();
      loadRequest.current = null;
    };
  }, [refresh]);

  async function addGame(game, requestId) {
    const savedGame = await saveGame(userId, game, requestId);
    loadRequest.current?.savedGames.set(savedGame.id, savedGame);
    setGames((currentGames) => [savedGame, ...currentGames.filter(({ id }) => id !== savedGame.id)]);
  }

  return (
    <LibraryContext.Provider value={{ games, addGame, loading, loadError, refresh }}>
      <Stack.Navigator>
        <Stack.Screen name="GameLibrary" component={LibraryScreen} options={{ title: 'Library' }} />
        <Stack.Screen name="AddGame" component={AddGameRoute} options={{ title: 'Add Game' }} />
        <Stack.Screen
          name="GameDetails"
          component={GameDetailsScreen}
          options={{ title: 'Game Details' }}
        />
      </Stack.Navigator>
    </LibraryContext.Provider>
  );
}

function useSession() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    if (!supabase) return undefined;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    function updateAutoRefresh(state) {
      if (state === 'active') {
        void supabase.auth.startAutoRefresh();
      } else {
        void supabase.auth.stopAutoRefresh();
      }
    }

    if (AppState.currentState) updateAutoRefresh(AppState.currentState);
    const appStateListener = AppState.addEventListener('change', updateAutoRefresh);

    return () => {
      subscription.unsubscribe();
      appStateListener.remove();
      void supabase.auth.stopAutoRefresh();
    };
  }, []);

  return session;
}

export default function App() {
  const session = useSession();

  if (!supabase || session === undefined) {
    return (
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <SafeAreaView style={styles.startup}>
          {supabase ? (
            <ActivityIndicator accessibilityLabel="Restoring your session" />
          ) : (
            <Text accessibilityRole="alert">Set the Supabase project URL and publishable key in .env.local, then restart Expo.</Text>
          )}
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      {session ? (
        <Tab.Navigator key={session.user.id}>
          <Tab.Screen name="Library" options={{ headerShown: false }}>
            {() => <LibraryNavigator userId={session.user.id} />}
          </Tab.Screen>
          <Tab.Screen name="About">
            {() => <AboutScreen email={session.user.email} />}
          </Tab.Screen>
        </Tab.Navigator>
      ) : (
        <Stack.Navigator key="auth">
          <Stack.Screen name="SignIn" component={AuthScreen} options={{ title: 'Sign in' }} />
          <Stack.Screen name="SignUp" component={AuthScreen} options={{ title: 'Create account' }} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  startup: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    padding: 24,
    gap: 16,
  },
  libraryHeader: {
    gap: 16,
    marginBottom: 16,
  },
  noteLabel: {
    fontWeight: '600',
    marginBottom: 4,
  },
  heading: {
    fontSize: 22,
    fontWeight: '600',
  },
});
