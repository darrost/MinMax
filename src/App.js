import { createContext, useContext, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Button, FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import AddGameScreen from './AddGameScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const LibraryContext = createContext(null);

// Temporary entries for testing navigation before the API is connected.
const previewGames = [
  { id: 'pathfinder-wotr', title: 'Pathfinder: Wrath of the Righteous', platform: 'PC' },
  { id: 'elden-ring', title: 'Elden Ring', platform: 'PC' },
];

function LibraryScreen({ navigation }) {
  const { games } = useContext(LibraryContext);

  return (
    <FlatList
      data={games}
      keyExtractor={(game) => game.id}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <Button title="Add game" onPress={() => navigation.navigate('AddGame')} />
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

function AboutScreen() {
  return (
    <View style={styles.content}>
      <Text accessibilityRole="header" style={styles.heading}>MinMax</Text>
      <Text>Track your game backlog, save where you left off, and plan your next run.</Text>
    </View>
  );
}

function AddGameRoute({ navigation }) {
  const { addGame } = useContext(LibraryContext);

  return <AddGameScreen navigation={navigation} onSave={addGame} />;
}

function LibraryNavigator() {
  const [games, setGames] = useState(previewGames);
  const nextGameId = useRef(1);

  function addGame(game) {
    const id = 'local-' + nextGameId.current;
    nextGameId.current += 1;
    setGames((currentGames) => [{ ...game, id }, ...currentGames]);
  }

  return (
    <LibraryContext.Provider value={{ games, addGame }}>
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

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Tab.Navigator>
        <Tab.Screen name="Library" component={LibraryNavigator} options={{ headerShown: false }} />
        <Tab.Screen name="About" component={AboutScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 24,
    gap: 16,
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
