import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { buttonColor, deleteButtonColor } from './buttonColors';

export function GoalProgress({ completed, total }) {
  const fraction = total ? completed / total : 0;
  const [fill] = useState(() => new Animated.Value(fraction));
  useEffect(() => {
    const transition = Animated.timing(fill, {
      toValue: fraction, duration: 180, useNativeDriver: true, isInteraction: false,
    });
    transition.start();
    return () => transition.stop();
  }, [fraction, fill]);
  return (
    <View style={styles.track}>
      <Animated.View style={[styles.progress, { transform: [{ scaleX: fill }] }]} />
    </View>
  );
}

export function OutlineButton({ title, icon, onPress, disabled = false, compact = false, destructive = false, style }) {
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={title} disabled={disabled} accessibilityState={{ disabled }} onPress={onPress}
      activeOpacity={0.65} delayPressIn={0} style={[styles.toolbarButton, compact && styles.compact, disabled && styles.disabled, style]}>
      {icon && <Text style={styles.actionIcon}>{icon}</Text>}
      {!compact && <Text style={[styles.actionText, destructive && styles.destructive]}>{title}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  toolbarButton: {
    minHeight: 46, padding: 8, borderRadius: 999, borderWidth: 1,
    borderColor: '#8798b4', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6,
    backgroundColor: 'transparent',
  },
  actionIcon: { fontSize: 22, color: buttonColor },
  actionText: { flexShrink: 1, color: '#f7f9ff', fontWeight: '600', fontSize: 16 },
  track: { height: 5, backgroundColor: '#303c64', borderRadius: 3, overflow: 'hidden' },
  progress: { transformOrigin: 'left center', height: '100%', borderRadius: 3, backgroundColor: '#41baff' },
  compact: { minWidth: 46, alignSelf: 'center' },
  disabled: { opacity: 0.5 },
  destructive: { color: deleteButtonColor },
});
