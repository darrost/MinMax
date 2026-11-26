import { useRef, useState } from 'react';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { Button, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import GameCover from './GameCover';
import { CoverUploadError } from './gameCovers';

export const platforms = ['PC', 'PlayStation', 'Xbox', 'Nintendo', 'Mobile', 'Other'];
export const statuses = ['Want to play', 'Playing', 'Paused', 'Finished'];
const maxCoverDimension = 1200;

export function GameChoices({ label, options, value, onChange, disabled, multiple = false }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choices} accessibilityRole={multiple ? undefined : 'radiogroup'} accessibilityLabel={label}>
        {options.map((option) => {
          const selected = multiple ? value.includes(option) : value === option;

          return (
            <Pressable
              key={option}
              accessibilityRole={multiple ? 'checkbox' : 'radio'}
              accessibilityState={{ checked: selected, disabled }}
              disabled={disabled}
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
  const [crossSave, setCrossSave] = useState(initialGame?.cross_save ?? false);
  const [selectedPlatforms, setSelectedPlatforms] = useState(
    initialGame ? [initialGame.platform, ...(initialGame.extra_platforms ?? [])] : [],
  );
  const [platform, ...extraPlatforms] = selectedPlatforms;

  function choosePlatform(option) {
    if (!crossSave) return setSelectedPlatforms([option]);
    setSelectedPlatforms(current => current.includes(option)
      ? current.filter(item => item !== option)
      : [...current, option]);
  }
  const [status, setStatus] = useState(initialGame?.status ?? null);
  const [notes, setNotes] = useState(initialGame?.notes ?? '');
  const [coverChange, setCoverChange] = useState(undefined);
  const [pickingCover, setPickingCover] = useState(false);
  const [pickerError, setPickerError] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const savingRef = useRef(false);
  const pickingCoverRef = useRef(false);
  const lastAttempt = useRef(null);
  const cleanTitle = title.trim();
  const titleInvalid = cleanTitle.length < 2;
  const savedCoverPath = coverChange === undefined ? initialGame?.cover_path : null;
  const displayedCover = coverChange ?? savedCoverPath;

  async function chooseCover() {
    if (savingRef.current || pickingCoverRef.current) return;
    pickingCoverRef.current = true;
    setPickingCover(true);
    setPickerError(false);

    try {
      const result = await launchImageLibraryAsync({ mediaTypes: ['images'] });
      if (result.canceled) return;

      const context = ImageManipulator.manipulate(result.assets[0].uri, {
        maxWidth: maxCoverDimension,
        maxHeight: maxCoverDimension,
      });
      const image = await context.renderAsync();
      const resized = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
      setCoverChange(resized.uri);
    } catch {
      setPickerError(true);
    } finally {
      pickingCoverRef.current = false;
      setPickingCover(false);
    }
  }

  async function handleSave() {
    setSubmitted(true);

    if (titleInvalid || !platform || !status || savingRef.current || pickingCoverRef.current) {
      return;
    }

    const game = { title: cleanTitle, platform, extra_platforms: extraPlatforms, cross_save: crossSave, status, notes: notes.trim() };
    savingRef.current = true;
    setSaving(true);
    setSaveError('');
    try {
      const draft = JSON.stringify({ ...game, coverChange });
      if (lastAttempt.current?.draft !== draft) {
        // The game insert and cover upload reuse this token on a retry.
        const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
        lastAttempt.current = { draft, requestId };
      }
      await onSave(game, lastAttempt.current.requestId, coverChange);
      if (navigation.isFocused()) navigation.goBack();
    } catch (error) {
      setSaveError(error instanceof CoverUploadError
        ? error.message
        : 'Could not confirm the save. Check your connection and try again.');
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
          editable={!saving}
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

      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel="Cross-platform save"
        accessibilityState={{ checked: crossSave, disabled: saving }}
        disabled={saving}
        style={styles.choice}
        onPress={() => {
          if (crossSave) setSelectedPlatforms(current => current.slice(0, 1));
          setCrossSave(!crossSave);
        }}
      >
        <Text style={styles.choiceText}>{crossSave ? '☑' : '☐'}  Cross-platform save</Text>
      </Pressable>
      <GameChoices label={crossSave ? 'Platforms (select all that apply)' : 'Platform'} options={platforms}
        value={crossSave ? selectedPlatforms : platform} multiple={crossSave} onChange={choosePlatform} disabled={saving} />
      {submitted && !platform && (
        <Text accessibilityRole="alert" style={styles.error}>Choose a platform.</Text>
      )}

      <GameChoices label="Status" options={statuses} value={status} onChange={setStatus} disabled={saving} />
      {submitted && !status && (
        <Text accessibilityRole="alert" style={styles.error}>Choose a status.</Text>
      )}

      <View style={styles.field}>
        <Text style={styles.label}>Where I left off (optional)</Text>
        <TextInput
          accessibilityLabel="Where I left off"
          editable={!saving}
          style={[styles.input, styles.notes]}
          value={notes}
          onChangeText={setNotes}
          maxLength={500}
          multiline
          textAlignVertical="top"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Cover photo (optional)</Text>
        {displayedCover && (
          <GameCover key={displayedCover} path={savedCoverPath} localUri={coverChange} />
        )}
        <Button
          title={pickingCover ? 'Preparing cover…' : displayedCover ? 'Replace cover' : 'Choose cover'}
          onPress={chooseCover}
          disabled={saving || pickingCover}
        />
        {displayedCover && (
          <Button
            title="Remove cover"
            onPress={() => {
              setCoverChange(null);
              setPickerError(false);
            }}
            disabled={saving || pickingCover}
          />
        )}
        {pickerError && (
          <Text accessibilityRole="alert" style={styles.error}>
            Could not open or prepare that photo. Try choosing another one.
          </Text>
        )}
      </View>

      {saveError !== '' && (
        <Text accessibilityRole="alert" style={styles.error}>
          {saveError}
        </Text>
      )}
      <Button
        title={saving ? 'Saving…' : initialGame ? 'Save changes' : 'Save game'}
        onPress={handleSave}
        disabled={saving || pickingCover}
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
