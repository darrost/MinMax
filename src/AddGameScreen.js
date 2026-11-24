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

export default function AddGameScreen({ navigation, onSave, initialGame }) {
  const [title, setTitle] = useState(initialGame?.title ?? '');
  const [platform, setPlatform] = useState(initialGame?.platform ?? null);
  const [status, setStatus] = useState(initialGame?.status ?? null);
  const [notes, setNotes] = useState(initialGame?.notes ?? '');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const savingRef = useRef(false);
  const lastAttempt = useRef(null);
  const cleanTitle = title.trim();
  const titleInvalid = cleanTitle.length < 2;

  async function handleSave() {
    setSubmitted(true);

    if (titleInvalid || !platform || !status || savingRef.current) {
      return;
    }

    const game = { title: cleanTitle, platform, status, notes: notes.trim() };
    savingRef.current = true;
    setSaving(true);
    setSaveError(false);
    try {
      if (initialGame) {
        await onSave(game);
      } else {
        const draft = JSON.stringify(game);
        if (lastAttempt.current?.draft !== draft) {
          // The server uses this token only to recognize a retry of the same save.
          const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
          lastAttempt.current = { draft, requestId };
        }
        await onSave(game, lastAttempt.current.requestId);
      }
      if (navigation.isFocused()) navigation.goBack();
    } catch {
      setSaveError(true);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
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

      {saveError && (
        <Text accessibilityRole="alert" style={styles.error}>
          Could not confirm the save. Check your connection and try again.
        </Text>
      )}
      <Button
        title={saving ? 'Saving…' : initialGame ? 'Save changes' : 'Save game'}
        onPress={handleSave}
        disabled={saving}
      />
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
