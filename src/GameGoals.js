import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { GoalProgress, OutlineButton } from './LibraryControls';
import { supabase } from './supabase';

const columns = 'id, title, requirement, completed';

export default function GameGoals({ gameId, onChange }) {
  const [goals, setGoals] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [requirement, setRequirement] = useState('');
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const draftId = useRef(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setError('');
      try {
        const rows = [];
        const size = 100;
        while (true) {
          const { data, error } = await supabase.from('game_goals').select(columns)
            .eq('game_id', gameId).order('created_at').order('id').range(rows.length, rows.length + size - 1);
          if (!active) return;
          if (error) throw error;
          rows.push(...data);
          if (data.length < size) break;
        }
        setGoals(rows);
      } catch {
        if (active) setError('Could not load goals.');
      }
    }
    void load();
    return () => { active = false; };
  }, [gameId, attempt]);

  async function saveChange(action) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      await action();
      void onChange();
    } catch {
      setError('Could not confirm the goal change. Try again.');
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  async function addGoal() {
    const goal = { game_id: gameId, id: draftId.current, title: title.trim(), requirement: requirement.trim() };
    const { error } = await supabase.from('game_goals').upsert(goal, { onConflict: 'game_id,id', ignoreDuplicates: true });
    if (error) throw error;
    const saved = await supabase.from('game_goals').select(columns).eq('game_id', gameId).eq('id', goal.id).single();
    if (saved.error) throw saved.error;
    setGoals(current => [...current.filter(item => item.id !== goal.id), saved.data]);
    setAdding(false);
  }

  async function updateGoal(id, changes) {
    const { data, error } = await supabase.from('game_goals').update(changes)
      .eq('game_id', gameId).eq('id', id).select(columns).single();
    if (error) throw error;
    setGoals(current => current.map(item => item.id === id ? data : item));
  }

  function confirmDelete(goal) {
    Alert.alert('Delete goal?', goal.title, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => saveChange(async () => {
        const { error } = await supabase.from('game_goals').delete().eq('game_id', gameId).eq('id', goal.id);
        if (error) throw error;
        setGoals(current => current.filter(item => item.id !== goal.id));
        setEditingId(null);
      }) },
    ]);
  }

  function editGoal(goal) {
    setTitle(goal.title);
    setRequirement(goal.requirement);
    setEditingId(goal.id);
    setError('');
  }

  const completed = goals?.filter(goal => goal.completed).length ?? 0;
  const formOpen = adding || editingId !== null;
  const form = formOpen && (
    <View style={styles.section}>
      <Text style={styles.body}>Goal</Text>
      <TextInput accessibilityLabel="Goal" style={styles.input} maxLength={100} value={title} editable={!busy} onChangeText={setTitle} />
      <Text style={styles.body}>Requirement (optional)</Text>
      <TextInput accessibilityLabel="Requirement" style={styles.input} multiline maxLength={500} value={requirement} editable={!busy} onChangeText={setRequirement} />
      <OutlineButton title={adding ? 'Save goal' : 'Save changes'} disabled={busy || !title.trim()} onPress={() => saveChange(async () => {
        if (adding) return addGoal();
        await updateGoal(editingId, { title: title.trim(), requirement: requirement.trim() });
        setEditingId(null);
      })} />
      <OutlineButton title="Cancel" disabled={busy} onPress={() => {
        setEditingId(null);
        setAdding(false);
        setError('');
      }} />
    </View>
  );

  return (
    <View style={styles.section}>
      <View style={styles.summary}>
        <Text accessibilityRole="header" style={styles.heading}>Goals</Text>
        {goals && <Text style={styles.body}>{completed} of {goals.length} complete</Text>}
      </View>
      {goals && <GoalProgress completed={completed} total={goals.length} />}
      {error !== '' && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
      {goals === null ? (
        error ? <OutlineButton title="Retry goals" onPress={() => setAttempt(n => n + 1)} /> : <Text style={styles.body}>Loading goals…</Text>
      ) : (
        <>
          {goals.map(goal => goal.id === editingId ? (
            <View key={goal.id} style={styles.card}>
              {form}
              <OutlineButton destructive title="Delete goal" disabled={busy} onPress={() => confirmDelete(goal)} />
            </View>
          ) : (
            <View key={goal.id} style={[styles.card, goal.completed && styles.complete]}>
              <View style={styles.goalHeader}>
                <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: goal.completed, disabled: busy }}
                  accessibilityLabel={goal.title} disabled={busy} onPress={() => saveChange(() => updateGoal(goal.id, { completed: !goal.completed }))}
                  style={({ pressed }) => [styles.check, pressed && { opacity: 0.65 }]}>
                  <View style={styles.checkSlot}>
                    <View style={[styles.box, goal.completed && styles.checkedBox]}>
                      {goal.completed && <View style={styles.tick} />}
                    </View>
                  </View>
                  <Text style={[styles.title, goal.completed && styles.completedTitle]}>{goal.title}</Text>
                </Pressable>
                <OutlineButton compact icon="✎" title={`Edit goal: ${goal.title}`} disabled={busy || formOpen} onPress={() => editGoal(goal)} />
              </View>
              {!!goal.requirement && <Text style={styles.requirement}>{goal.requirement}</Text>}
            </View>
          ))}
          {adding ? form : (
            <OutlineButton icon="+" title="Add goal" disabled={busy || formOpen} onPress={() => {
              draftId.current = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
              setTitle('');
              setRequirement('');
              setAdding(true);
            }} />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { color: '#d2dfec' },
  error: { color: '#ffb3c3' },
  section: { gap: 12 },
  summary: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heading: { color: '#eff5fb', fontSize: 20, fontWeight: '600' },
  card: { borderWidth: 1, borderColor: '#3d4877', backgroundColor: '#171f4a', borderRadius: 16, padding: 14, gap: 4 },
  complete: { backgroundColor: '#20392e', borderColor: '#63997a' },
  completedTitle: { color: '#a8e7b6' },
  check: { flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: 46, gap: 8 },
  checkSlot: { width: 46, alignItems: 'center' },
  box: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 7, borderWidth: 2, borderColor: '#90d8ff' },
  checkedBox: { backgroundColor: '#a8e7b6', borderColor: '#a8e7b6' },
  tick: { width: 10, height: 17, marginTop: -3, borderBottomWidth: 3, borderRightWidth: 3, borderColor: '#20392e', transform: [{ rotate: '45deg' }] },
  title: { flex: 1, color: '#eff5fb', fontSize: 18, fontWeight: '600', textAlign: 'center' },
  requirement: { color: '#d2dfec', fontSize: 16, lineHeight: 23 },
  input: { minHeight: 44, borderWidth: 1, borderColor: '#8290a6', borderRadius: 8, padding: 10, backgroundColor: '#111837', color: '#eff5fb' },
});
