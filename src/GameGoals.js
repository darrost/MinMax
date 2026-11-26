import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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
      }) },
    ]);
  }

  const formOpen = adding || editingId !== null;
  const form = formOpen && (
    <View style={styles.section}>
      <Text>Goal</Text>
      <TextInput accessibilityLabel="Goal" style={styles.input} maxLength={100} value={title} editable={!busy} onChangeText={setTitle} />
      <Text>Requirement (optional)</Text>
      <TextInput accessibilityLabel="Requirement" style={styles.input} multiline maxLength={500} value={requirement} editable={!busy} onChangeText={setRequirement} />
      <Button title={adding ? 'Save goal' : 'Save changes'} disabled={busy || !title.trim()} onPress={() => saveChange(async () => {
        if (adding) return addGoal();
        await updateGoal(editingId, { title: title.trim(), requirement: requirement.trim() });
        setEditingId(null);
      })} />
      <Button title="Cancel" disabled={busy} onPress={() => {
        setEditingId(null);
        setAdding(false);
        setError('');
      }} />
    </View>
  );

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.heading}>Goals</Text>
      {error !== '' && <Text accessibilityRole="alert">{error}</Text>}
      {goals === null ? (
        error ? <Button title="Retry goals" onPress={() => setAttempt(n => n + 1)} /> : <Text>Loading goals…</Text>
      ) : (
        <>
          {goals.map(goal => goal.id === editingId ? <View key={goal.id} style={styles.card}>{form}</View> : (
            <View key={goal.id} style={[styles.card, goal.completed && styles.complete]}>
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: goal.completed, disabled: busy }}
                accessibilityLabel={goal.title} disabled={busy} onPress={() => saveChange(() => updateGoal(goal.id, { completed: !goal.completed }))}
                style={styles.check}>
                <Text style={styles.title}>{goal.completed ? '☑' : '☐'}  {goal.title}</Text>
              </Pressable>
              {!!goal.requirement && <Text>{goal.requirement}</Text>}
              <Button title="Edit goal" disabled={busy || formOpen} onPress={() => {
                setTitle(goal.title);
                setRequirement(goal.requirement);
                setEditingId(goal.id);
                setError('');
              }} />
              <Button title="Delete goal" color="#a21830" disabled={busy} onPress={() => confirmDelete(goal)} />
            </View>
          ))}
          {adding ? form : (
            <Button title="Add goal" disabled={busy || formOpen} onPress={() => {
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
  section: { gap: 8 },
  heading: { fontSize: 20, fontWeight: '600' },
  card: { backgroundColor: '#ffffff', borderRadius: 8, padding: 12, gap: 4 },
  complete: { backgroundColor: '#e3f1e6' },
  check: { minHeight: 44, justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '600' },
  input: { minHeight: 44, borderWidth: 1, borderColor: '#8290a6', borderRadius: 8, padding: 10, backgroundColor: '#ffffff' },
});
