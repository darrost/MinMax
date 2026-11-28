import { useRef, useState } from 'react';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { OutlineButton } from './LibraryControls';
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
              style={({ pressed }) => [styles.choice, selected && styles.selectedChoice, pressed && styles.pressed]}
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
  const titleInvalid = cleanTitle.length === 0;
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
      style={styles.canvas}
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}
    >
      <View style={styles.card}>
        <View style={styles.field}>
          <Text style={styles.label}>Game title</Text>
          <TextInput keyboardAppearance="dark"
            accessibilityLabel="Game title"
            editable={!saving}
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
          {submitted && titleInvalid && (
            <Text accessibilityRole="alert" style={styles.error}>
              Enter a game title.
            </Text>
          )}
        </View>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel="Cross-platform save"
          accessibilityState={{ checked: crossSave, disabled: saving }}
          disabled={saving}
          style={({ pressed }) => [styles.choice, styles.crossSaveRow, crossSave && styles.selectedChoice, pressed && styles.pressed]}
          onPress={() => {
            if (crossSave) setSelectedPlatforms(current => current.slice(0, 1));
            setCrossSave(!crossSave);
          }}
        >
          <View style={[styles.checkbox, crossSave && styles.checkedBox]}>
            {crossSave && <View style={styles.checkmark} />}
          </View>
          <Text style={styles.crossSaveLabel}>Cross-platform save</Text>
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
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Where I left off (optional)</Text>
        <TextInput keyboardAppearance="dark"
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

      <View style={styles.card}>
        <Text style={styles.label}>Cover photo (optional)</Text>
        {displayedCover && (
          <GameCover key={displayedCover} path={savedCoverPath} localUri={coverChange} />
        )}
        <OutlineButton style={styles.coverButton} icon={displayedCover || pickingCover ? undefined : "+"}
          title={pickingCover ? 'Preparing cover…' : displayedCover ? 'Replace cover photo' : 'Add cover photo'}
          onPress={chooseCover}
          disabled={saving || pickingCover}
        />
        {displayedCover && (
          <OutlineButton destructive
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
      <OutlineButton style={styles.saveButton}
        title={saving ? 'Saving…' : initialGame ? 'Save changes' : 'Save game'}
        onPress={handleSave}
        disabled={saving || pickingCover}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    width: '100%', maxWidth: 560, alignSelf: 'center',
    gap: 16,
  },
  canvas: { flex: 1, backgroundColor: '#0a0d27' },
  card: { padding: 16, gap: 12, borderRadius: 16, borderWidth: 1, borderColor: '#3d4877', backgroundColor: '#171f4a' },
  crossSaveRow: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', gap: 12, minHeight: 52 },
  crossSaveLabel: { flexShrink: 1, color: '#f7f9ff', fontSize: 17, fontWeight: '700' },
  checkbox: { width: 28, height: 28, borderRadius: 7, borderWidth: 2, borderColor: '#adcae8', alignItems: 'center', justifyContent: 'center' },
  checkedBox: { backgroundColor: '#70cbff', borderColor: '#70cbff' },
  checkmark: { width: 10, height: 17, marginTop: -3, borderRightWidth: 3, borderBottomWidth: 3, borderColor: '#0a0d27', transform: [{ rotate: '45deg' }] },
  coverButton: { minHeight: 52, borderColor: '#90d8ff', backgroundColor: '#0a0d27' },
  saveButton: { borderColor: '#70cbff' },
  pressed: { opacity: 0.7 },
  field: {
    gap: 8,
  },
  label: {
    color: '#eff5fb',
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#7488ac',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#0a0d27',
    color: '#eff5fb',
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
    borderColor: '#7488ac',
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  selectedChoice: {
    backgroundColor: '#293e80',
    borderColor: '#70cbff',
  },
  choiceText: {
    color: '#eff5fb',
    fontSize: 15,
  },
  selectedChoiceText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  error: {
    color: '#ffb3c3',
  },
});
