import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Button, FlatList, StyleSheet, Text, View } from 'react-native';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Temporary entries for testing navigation before the API is connected.
const previewGames = [
  { id: 'pathfinder-wotr', title: 'Pathfinder: Wrath of the Righteous', platform: 'PC' },
  { id: 'elden-ring', title: 'Elden Ring', platform: 'PC' },
];

function LibraryScreen({ navigation }) {
  return (
    <FlatList
      data={previewGames}
      keyExtractor={(game) => game.id}
      contentContainerStyle={styles.content}
      ListHeaderComponent={<Text style={styles.heading}>Preview games</Text>}
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
  const game = previewGames.find(({ id }) => id === route.params?.gameId);

  return (
    <View style={styles.content}>
      {game ? (
        <>
          <Text accessibilityRole="header" style={styles.heading}>{game.title}</Text>
          <Text>Platform: {game.platform}</Text>
        </>
      ) : (
        <Text>Game unavailable.</Text>
      )}
    </View>
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

function LibraryNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="GameLibrary" component={LibraryScreen} options={{ title: 'Library' }} />
      <Stack.Screen
        name="GameDetails"
        component={GameDetailsScreen}
        options={{ title: 'Game Details' }}
      />
    </Stack.Navigator>
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
  heading: {
    fontSize: 22,
    fontWeight: '600',
  },
});
