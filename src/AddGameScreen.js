import { useRef, useState } from 'react';
import { Button, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

const platforms = ['PC', 'PlayStation', 'Xbox', 'Nintendo', 'Mobile', 'Other'];
const statuses = ['Want to play', 'Playing', 'Paused', 'Finished'];

function GameChoices({ label, options, value, onChange }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choices} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((option) => {
          const selected = value === option;

          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => onChange(option)}
              style={[styles.choice, selected && styles.selectedChoice]}
            >
              <Text style={[styles.choiceText, selected && styles.selectedChoiceText]}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function AddGameScreen({ navigation, onSave }) {
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState(null);
  const [status, setStatus] = useState(null);
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const saved = useRef(false);
  const cleanTitle = title.trim();
  const titleInvalid = cleanTitle.length < 2;

  function handleSave() {
    setSubmitted(true);

    if (titleInvalid || !platform || !status || saved.current) {
      return;
    }

    saved.current = true;
    onSave({ title: cleanTitle, platform, status, notes: notes.trim() });
    navigation.goBack();
  }

  return (
    <ScrollView
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}
    >
      <View style={styles.field}>
        <Text style={styles.label}>Game title</Text>
        <TextInput
          accessibilityLabel="Game title"
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />
        {submitted && titleInvalid && (
          <Text accessibilityRole="alert" style={styles.error}>
            Enter a title with at least 2 characters.
          </Text>
        )}
      </View>

      <GameChoices label="Platform" options={platforms} value={platform} onChange={setPlatform} />
      {submitted && !platform && (
        <Text accessibilityRole="alert" style={styles.error}>Choose a platform.</Text>
      )}

      <GameChoices label="Status" options={statuses} value={status} onChange={setStatus} />
      {submitted && !status && (
        <Text accessibilityRole="alert" style={styles.error}>Choose a status.</Text>
      )}

      <View style={styles.field}>
        <Text style={styles.label}>Where I left off (optional)</Text>
        <TextInput
          accessibilityLabel="Where I left off"
          style={[styles.input, styles.notes]}
          value={notes}
          onChangeText={setNotes}
          maxLength={500}
          multiline
          textAlignVertical="top"
        />
      </View>

      <Button title="Save game" onPress={handleSave} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 24,
    gap: 16,
  },
  field: {
    gap: 8,
  },
  label: {
    color: '#182134',
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#8290a6',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#ffffff',
    color: '#182134',
    fontSize: 16,
  },
  notes: {
    minHeight: 100,
  },
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choice: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#8290a6',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  selectedChoice: {
    backgroundColor: '#1b4d91',
    borderColor: '#1b4d91',
  },
  choiceText: {
    color: '#182134',
    fontSize: 15,
  },
  selectedChoiceText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  error: {
    color: '#a21830',
  },
});
