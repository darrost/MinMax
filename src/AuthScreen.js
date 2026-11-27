import { useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { OutlineButton } from './LibraryControls';
import { supabase } from './supabase';

const eye = require('../assets/password-eye.png');
const eyeOff = require('../assets/password-eye-off.png');

function PasswordField({ label, visibilityLabel = 'password', visible, onToggle, inputRef, ...inputProps }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputFrame, styles.passwordRow, focused && styles.focused]}>
        <TextInput keyboardAppearance="dark"
          {...inputProps}
          ref={inputRef}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={!visible}
          style={[styles.inputText, styles.passwordInput]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={(visible ? 'Hide ' : 'Show ') + visibilityLabel}
          onPress={onToggle}
          style={({ pressed }) => [styles.eyeButton, pressed && styles.eyeButtonPressed]}
        >
          <Image
            accessible={false}
            source={visible ? eyeOff : eye}
            style={styles.eyeIcon}
          />
        </Pressable>
      </View>
    </View>
  );
}

export default function AuthScreen({ navigation, route }) {
  const registering = route.name === 'SignUp';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const submitting = useRef(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const passwordInput = useRef(null);
  const confirmInput = useRef(null);

  async function submit() {
    if (submitting.current) return;

    setError('');
    setNotice('');
    const address = email.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError('Enter a valid email address.');
      return;
    }
    if (!password || (registering && password.length < 6)) {
      setError(registering ? 'Use at least 6 characters for your password.' : 'Enter your password.');
      return;
    }

    if (registering && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    submitting.current = true;
    setBusy(true);
    try {
      const credentials = { email: address, password };
      const result = registering
        ? await supabase.auth.signUp(credentials)
        : await supabase.auth.signInWithPassword(credentials);

      if (result.error) throw result.error;
      if (registering && !result.data.session) {
        setPassword('');
        setConfirmPassword('');
        setShowPassword(false);
        setShowConfirmPassword(false);
        setNotice('Check your email for a confirmation link, then return to MinMax and sign in.');
      }
    } catch (requestError) {
      setError(requestError.message || 'Something went wrong. Try again.');
    } finally {
      submitting.current = false;
      setBusy(false);
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
        <Text accessibilityRole="header" style={styles.heading}>
          {registering ? 'Join MinMax' : 'Welcome back'}
        </Text>
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput keyboardAppearance="dark"
            accessibilityLabel="Email"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="next"
            onSubmitEditing={() => passwordInput.current?.focus()}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            editable={!busy}
            value={email}
            onChangeText={setEmail}
            style={[styles.inputFrame, styles.inputText, emailFocused && styles.focused]}
          />
        </View>
        <PasswordField
          inputRef={passwordInput}
          label="Password"
          autoComplete={registering ? 'new-password' : 'current-password'}
          editable={!busy}
          value={password}
          onChangeText={setPassword}
          visible={showPassword}
          onToggle={() => setShowPassword((visible) => !visible)}
          returnKeyType={registering ? 'next' : 'done'}
          onSubmitEditing={registering ? () => confirmInput.current?.focus() : submit}
        />
        {registering && (
          <PasswordField
            label="Confirm password"
            visibilityLabel="confirmation password"
            inputRef={confirmInput}
            autoComplete="new-password"
            editable={!busy}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            visible={showConfirmPassword}
            onToggle={() => setShowConfirmPassword((visible) => !visible)}
            returnKeyType="done"
            onSubmitEditing={submit}
          />
        )}
        {error !== '' && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        {notice !== '' && <Text style={styles.label} accessibilityRole="alert">{notice}</Text>}
        <OutlineButton style={styles.primaryAction}
          title={busy ? 'Please wait…' : registering ? 'Create account' : 'Sign in'}
          onPress={submit}
          disabled={busy}
        />
      </View>
      <OutlineButton
        title={registering ? 'Back to sign in' : 'Create an account'}
        onPress={() => registering ? navigation.goBack() : navigation.navigate('SignUp')}
        disabled={busy}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  canvas: { flex: 1, backgroundColor: '#0a0d27' },
  content: {
    width: '100%', maxWidth: 520, alignSelf: 'center',
    padding: 20,
    paddingTop: 36,
    gap: 16,
  },
  card: {
    padding: 20, gap: 18, borderRadius: 16, borderWidth: 1,
    borderColor: '#3d4877', backgroundColor: '#171f4a',
  },
  focused: { borderColor: '#70cbff' },
  primaryAction: { borderColor: '#70cbff' },
  heading: {
    color: '#eff5fb',
    fontSize: 26,
    fontWeight: '600',
  },
  field: {
    gap: 8,
  },
  label: {
    color: '#d9e6f5',
    fontSize: 16,
    fontWeight: '600',
  },
  inputFrame: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#7488ac',
    borderRadius: 12,
    backgroundColor: '#0a0d27',
  },
  inputText: {
    padding: 12,
    color: '#eff5fb',
    fontSize: 16,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    minWidth: 0,
  },
  eyeButton: {
    width: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeButtonPressed: {
    opacity: 0.55,
  },
  eyeIcon: {
    tintColor: '#90d8ff',
    width: 22,
    height: 22,
  },
  error: {
    color: '#ffb3c3',
  },
});
