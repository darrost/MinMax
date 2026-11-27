import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { BottomTabBar, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Alert, AppState, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AddGameScreen, { GameChoices, platforms, statuses } from './AddGameScreen';
import AuthScreen from './AuthScreen';
import GameCover from './GameCover';
import { GoalProgress, OutlineButton, SearchIcon } from './LibraryControls';
import GameGoals from './GameGoals';
import { deleteGame, loadGames, saveGame, updateGame } from './games';
import { supabase } from './supabase';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const LibraryContext = createContext(null);
const navigationTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: '#0a0d27', card: '#101638', primary: '#70cbff' },
};

const infoHeader = {
  headerStyle: { backgroundColor: '#0a0d27' },
  headerTintColor: '#d9e6f5',
  headerShadowVisible: false,
  contentStyle: { backgroundColor: '#0a0d27' },
};

function GlassTabBar(props) {
  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.tabCanvasBase}>
      <BottomTabBar {...props} insets={{ ...props.insets, bottom: 0, left: 0, right: 0 }} />
    </SafeAreaView>
  );
}

function LibraryScreen({ navigation }) {
  const { games, loading, loadError, refresh } = useContext(LibraryContext);
  const [showFilters, setShowFilters] = useState(false);
  const [status, setStatus] = useState('All');
  const [platform, setPlatform] = useState('All');
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const titleQuery = query.trim().toLowerCase();
  const filtered = status !== 'All' || platform !== 'All';
  const visibleGames = filtered || titleQuery ? games.filter(game =>
    game.title.toLowerCase().includes(titleQuery) &&
    (status === 'All' || game.status === status) &&
    (platform === 'All' || game.platform === platform || game.extra_platforms?.includes(platform))
  ) : games;

  return (
    <FlatList
      data={visibleGames}
      keyExtractor={(game) => game.id}
      style={styles.canvas}
      contentContainerStyle={styles.libraryContent}
      refreshing={loading}
      onRefresh={refresh}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      ListHeaderComponent={
        <View style={styles.libraryHeader}>
          <View style={styles.toolbar}>
            <OutlineButton style={styles.toolbarItem} title="Add game" icon="＋" onPress={() => navigation.navigate('AddGame')} />
            <OutlineButton style={styles.toolbarItem} title={showFilters ? 'Hide filters' : 'Filters'} icon="≡" onPress={() => setShowFilters(open => !open)} />
          </View>
          {searchOpen ? (
            <View style={styles.toolbar}>
              <TextInput
                accessibilityLabel="Search games by title"
                placeholder="Search by title"
                placeholderTextColor="#adcae8"
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                keyboardAppearance="dark"
              />
              <OutlineButton compact title="Close and clear search" icon="×" onPress={() => {
                setQuery('');
                setSearchOpen(false);
              }} />
            </View>
          ) : (
            <OutlineButton title="Search by title" icon={<SearchIcon />} onPress={() => setSearchOpen(true)} />
          )}
          {showFilters && (
            <>
              <GameChoices label="Status" options={['All', ...statuses]} value={status} onChange={setStatus} />
              <GameChoices label="Platform" options={['All', ...platforms]} value={platform} onChange={setPlatform} />
            </>
          )}
          {filtered && (
            <View>
              {!showFilters && <Text style={styles.gameMeta}>{[status, platform].filter(value => value !== 'All').join(' · ')}</Text>}
              <OutlineButton title="Clear filters" onPress={() => {
                setStatus('All');
                setPlatform('All');
              }} />
            </View>
          )}
          {loadError && (
            <View>
              <Text style={styles.gameMeta} accessibilityRole="alert">Could not load your games.</Text>
              <OutlineButton title="Try again" onPress={refresh} />
            </View>
          )}
        </View>
      }
      ListEmptyComponent={
        !loading && !loadError ? (
          <Text style={styles.gameMeta}>{!games.length ? 'Add your first game to start your library.' :
            titleQuery ? 'No matching games. Try another title or check your filters.' : 'No games match these filters.'}</Text>
        ) : null
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          accessibilityRole="button" activeOpacity={0.72} delayPressIn={0}
          style={styles.gameRow}
          onPress={() => navigation.navigate('GameDetails', { gameId: item.id })}
        >
          {item.cover_path && <GameCover key={item.cover_path} path={item.cover_path} thumbnail />}
          <View style={styles.gameSummary}>
            <Text style={styles.gameTitle}>{item.title}</Text>
            <Text style={styles.gameMeta}>{[item.platform, ...(item.extra_platforms ?? [])].join(', ')} · <Text style={styles.status}>{item.status}</Text></Text>
            {item.goals?.[0]?.count > 0 && (
              <>
              <Text style={styles.gameMeta}>
                {item.completed_goals?.[0]?.count ?? 0} of {item.goals[0].count} {item.goals[0].count === 1 ? 'goal' : 'goals'} complete
              </Text>
                <GoalProgress completed={item.completed_goals?.[0]?.count ?? 0} total={item.goals[0].count} />
              </>
            )}
          </View>
          <Text accessible={false} style={styles.chevron}>›</Text>
        </TouchableOpacity>
      )}
    />
  );
}

function GameDetailsScreen({ navigation, route }) {
  const { games, removeGame, refresh } = useContext(LibraryContext);
  const game = games.find(({ id }) => id === route.params?.gameId);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const deletingRef = useRef(false);

  function confirmDelete() {
    Alert.alert('Delete game?', `Remove “${game.title}” from your library?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => handleDelete(game.id) },
    ]);
  }

  async function handleDelete(gameId) {
    if (deletingRef.current) return;
    deletingRef.current = true;
    setDeleting(true);
    setDeleteError(false);

    try {
      await removeGame(gameId);
      if (navigation.isFocused()) navigation.goBack();
    } catch {
      setDeleteError(true);
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  }

  return (
    <ScrollView style={styles.canvas} automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" contentContainerStyle={styles.libraryContent}>
      {game ? (
        <>
          {game.cover_path && <GameCover key={game.cover_path} path={game.cover_path} hero />}
          <View style={styles.detailsHeading}>
            <View style={styles.gameIdentity}>
              <Text accessibilityRole="header" style={styles.heading}>{game.title}</Text>
              <Text style={styles.gameMeta}>
                {[game.platform, ...(game.extra_platforms ?? [])].join(', ')} · <Text style={styles.status}>{game.status}</Text>
              </Text>
              {game.cross_save && <Text style={styles.gameMeta}>Cross-platform save</Text>}
            </View>
            <OutlineButton compact title="Edit game" icon="✎" disabled={deleting}
              onPress={() => navigation.navigate('EditGame', { gameId: game.id })} />
          </View>
          {!!game.notes && (
            <View style={styles.noteCard}>
              <Text style={styles.noteLabel}>Where I left off</Text>
              <Text style={styles.infoText}>{game.notes}</Text>
            </View>
          )}
          <GameGoals key={game.id} gameId={game.id} onChange={refresh} />
          <OutlineButton destructive title={deleting ? 'Deleting…' : 'Delete game'} disabled={deleting} onPress={confirmDelete} />
          {deleteError && (
            <Text accessibilityRole="alert" style={styles.errorText}>
              Could not confirm deletion. Refresh the library or try again.
            </Text>
          )}
        </>
      ) : (
        <Text style={styles.infoText}>Game unavailable.</Text>
      )}
    </ScrollView>
  );
}

function AboutScreen() {
  return (
    <ScrollView style={styles.canvas} contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={styles.heading}>How to use MinMax</Text>
      <View style={styles.noteCard}>
        <Text accessibilityRole="header" style={styles.noteLabel}>Track a game</Text>
        <Text style={styles.infoText}>In Library, tap Add game. Enter a title, choose a platform and status, and save. Use “Where I left off” to remember what to do next.</Text>
      </View>
      <View style={styles.noteCard}>
        <Text accessibilityRole="header" style={styles.noteLabel}>Track a shared save</Text>
        <Text style={styles.infoText}>If your game supports cross-platform saves, check Cross-platform save and select the platforms where you play that save.</Text>
      </View>
      <View style={styles.noteCard}>
        <Text accessibilityRole="header" style={styles.noteLabel}>Set goals</Text>
        <Text style={styles.infoText}>Open a saved game to add a goal and describe its requirement. Check it off when you finish. Your Library shows how many goals you’ve completed.</Text>
      </View>
    </ScrollView>
  );
}

function AccountScreen({ email, navigation }) {
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
    <ScrollView style={styles.canvas} contentContainerStyle={styles.content}>
      <View style={styles.detailsHeading}>
        <View style={styles.profileButton}>
          <View style={styles.profileHead} />
          <View style={styles.profileShoulders} />
        </View>
        <Text accessibilityRole="header" style={styles.heading}>Your account</Text>
      </View>
      <View style={styles.noteCard}>
        <Text style={styles.noteLabel}>Signed in as</Text>
        <Text selectable style={styles.gameTitle}>{email}</Text>
      </View>
      {error !== '' && <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>}
      <OutlineButton title="Close" onPress={() => navigation.goBack()} />
      <OutlineButton destructive title={signingOut ? 'Signing out…' : 'Sign out'} onPress={signOut} disabled={signingOut} />
    </ScrollView>
  );
}

function AddGameRoute({ navigation }) {
  const { addGame } = useContext(LibraryContext);

  return <AddGameScreen navigation={navigation} onSave={addGame} />;
}

function EditGameRoute({ navigation, route }) {
  const { games, editGame } = useContext(LibraryContext);
  const game = games.find(({ id }) => id === route.params?.gameId);

  if (!game) {
    return <View style={styles.content}><Text style={styles.infoText}>Game unavailable.</Text></View>;
  }

  return (
    <AddGameScreen
      key={game.id}
      navigation={navigation}
      initialGame={game}
      onSave={(changes, requestId, coverChange) => editGame(game.id, changes, requestId, coverChange)}
    />
  );
}

function LibraryNavigator({ userId, email }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const loadRequest = useRef(null);

  const refresh = useCallback(async () => {
    loadRequest.current?.abort();
    const request = new AbortController();
    loadRequest.current = request;
    setLoading(true);
    setLoadError(false);

    try {
      const results = await loadGames(userId, request.signal);
      if (loadRequest.current === request) {
        setGames(results);
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
      loadRequest.current?.abort();
      loadRequest.current = null;
    };
  }, [refresh]);

  function applyGameChange(updateGames) {
    setGames(updateGames);
    // Restart any in-flight refresh that may have fetched pre-mutation rows.
    if (loadRequest.current) void refresh();
  }

  async function addGame(game, requestId, coverUri) {
    const savedGame = await saveGame(userId, game, requestId, coverUri);
    applyGameChange((currentGames) => [savedGame, ...currentGames.filter(({ id }) => id !== savedGame.id)]);
  }

  async function editGame(gameId, changes, requestId, coverChange) {
    const savedGame = await updateGame(userId, gameId, changes, requestId, coverChange);
    applyGameChange((currentGames) => currentGames.map((game) => (game.id === gameId ? { ...game, ...savedGame } : game)));
  }

  async function removeGame(gameId) {
    await deleteGame(userId, gameId);
    applyGameChange((currentGames) => currentGames.filter(({ id }) => id !== gameId));
  }

  return (
    <LibraryContext.Provider value={{ games, addGame, editGame, removeGame, loading, loadError, refresh }}>
      <Stack.Navigator screenOptions={infoHeader}>
        <Stack.Screen name="GameLibrary" component={LibraryScreen} options={({ navigation }) => ({
          title: 'Library',
          headerTitleAlign: 'left', headerStyle: { backgroundColor: '#0a0d27' }, headerShadowVisible: false,
          headerTintColor: '#f7f9ff', headerTitleStyle: { fontSize: 28, fontWeight: '700' },
          headerRightBackgroundVisible: false,
          headerRight: () => (
            <Pressable accessibilityRole="button" accessibilityLabel="Open account"
              style={({ pressed }) => [styles.profileButton, pressed && { opacity: 0.75 }]}
              onPress={() => navigation.navigate('Account')}>
              <View style={styles.profileHead} />
              <View style={styles.profileShoulders} />
            </Pressable>
          ),
        })} />
        <Stack.Screen name="Account" options={{ presentation: 'formSheet', contentStyle: { backgroundColor: '#0a0d27' }, headerShown: false, sheetAllowedDetents: [0.5, 1], sheetGrabberVisible: true }}>
          {({ navigation }) => <AccountScreen email={email} navigation={navigation} />}
        </Stack.Screen>
        <Stack.Screen name="AddGame" component={AddGameRoute} options={{ title: 'Add Game' }} />
        <Stack.Screen name="EditGame" component={EditGameRoute} options={{ title: 'Edit Game' }} />
        <Stack.Screen
          name="GameDetails"
          component={GameDetailsScreen}
          options={{ ...infoHeader, title: 'Game Details' }}
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
        <StatusBar style="light" />
        <SafeAreaView style={styles.startup}>
          {supabase ? (
            <ActivityIndicator accessibilityLabel="Restoring your session" />
          ) : (
            <Text style={styles.errorText} accessibilityRole="alert">Set the Supabase project URL and publishable key in .env.local, then restart Expo.</Text>
          )}
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style="light" />
      {session ? (
        <Tab.Navigator tabBar={props => <GlassTabBar {...props} />} key={session.user.id} layout={({ children }) => <View style={styles.tabCanvas}>{children}</View>}
          screenOptions={({ route }) => ({
            tabBarLabelPosition: 'below-icon',
            tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
            tabBarStyle: styles.tabBar,
            tabBarActiveTintColor: '#70cbff', tabBarInactiveTintColor: '#bbc4d8',
            tabBarIcon: ({ color }) => route.name === 'About'
              ? <Text accessible={false} style={{ color, fontSize: 23 }}>ⓘ</Text>
              : <View style={styles.books}>
                  {[0, 1, 2].map(i => <View key={i} style={[styles.book, { backgroundColor: color }, i === 2 && styles.tilt]} />)}
                </View>,
          })}>
          <Tab.Screen name="Library" options={{ headerShown: false }}>
            {() => <LibraryNavigator userId={session.user.id} email={session.user.email} />}
          </Tab.Screen>
          <Tab.Screen name="About" component={AboutScreen} options={infoHeader} />
        </Tab.Navigator>
      ) : (
        <Stack.Navigator key="auth" screenOptions={infoHeader}>
          <Stack.Screen name="SignIn" component={AuthScreen} options={{ title: 'Sign in' }} />
          <Stack.Screen name="SignUp" component={AuthScreen} options={{ title: 'Create account' }} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  profileButton: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent', borderColor: '#8798b4', borderWidth: 1, gap: 2,
  },
  profileHead: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#70cbff' },
  profileShoulders: { width: 20, height: 9, borderTopLeftRadius: 10, borderTopRightRadius: 10, backgroundColor: '#70cbff' },
  startup: {
    backgroundColor: '#0a0d27',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    padding: 24,
    gap: 16,
  },
  canvas: {
    flex: 1, backgroundColor: '#0a0d27',
  },
  libraryContent: { padding: 14, gap: 12, paddingBottom: 24 },
  libraryHeader: { gap: 12, marginBottom: 6 },
  toolbar: { flexDirection: 'row', gap: 10 },
  toolbarItem: { flex: 1 },
  searchInput: {
    flex: 1, minWidth: 0, minHeight: 46, paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 23, borderWidth: 1, borderColor: '#70cbff', backgroundColor: '#171f4a',
    color: '#f7f9ff', fontSize: 16,
  },
  gameRow: {
    overflow: 'hidden', flexDirection: 'row', alignItems: 'center', minHeight: 92,
    borderRadius: 16, borderWidth: 1, borderColor: '#3d4877', backgroundColor: '#171f4a',
  },
  gameSummary: { flex: 1, paddingVertical: 14, paddingLeft: 12, gap: 5 },
  gameTitle: { color: '#f7f9ff', fontSize: 19, fontWeight: '700' },
  gameMeta: { color: '#d1dbed', fontSize: 14 },
  status: { color: '#90d8ff' },
  chevron: { color: '#cbd7e5', fontSize: 23, paddingHorizontal: 9 },
  tabCanvas: { flex: 1, backgroundColor: '#0a0d27' },
  tabCanvasBase: { backgroundColor: '#0a0d27' },
  tabBar: {
    height: 62, marginHorizontal: 12, marginVertical: 5, borderRadius: 31,
    paddingVertical: 5, borderWidth: 1, borderTopWidth: 1, borderColor: '#8798b4',
    backgroundColor: 'transparent', overflow: 'hidden', elevation: 0,
  },
  books: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  book: { width: 4, height: 16, borderRadius: 1 },
  tilt: { transform: [{ rotate: '-12deg' }] },
  infoText: { color: '#d2dfec', fontSize: 16, lineHeight: 23 },
  errorText: { color: '#ffb3c3' },
  detailsHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gameIdentity: { flex: 1, gap: 4 },
  noteCard: { borderRadius: 16, borderWidth: 1, borderColor: '#3d4877', backgroundColor: '#171f4a', padding: 14 },
  noteLabel: {
    color: '#adcae8',
    fontWeight: '600',
    marginBottom: 4,
  },
  heading: {
    color: '#eff5fb',
    fontSize: 22,
    fontWeight: '600',
  },
});
