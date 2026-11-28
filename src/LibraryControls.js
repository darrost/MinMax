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

export function SearchIcon() {
  return (
    <View style={styles.searchIcon} accessible={false}>
      <View style={styles.lens} />
      <View style={styles.handle} />
    </View>
  );
}

export function PinIcon({ pinned }) {
  return (
    <View style={styles.pinIcon} accessible={false}>
      <View style={styles.pinCap} />
      <View style={[styles.pinNeck, pinned && styles.pinFilled]} />
      <View style={styles.pinShoulder} />
      <View style={styles.pinStem} />
    </View>
  );
}

export function OutlineButton({ title, icon, onPress, disabled = false, compact = false, destructive = false, style }) {
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={title} disabled={disabled} accessibilityState={{ disabled }} onPress={onPress}
      activeOpacity={0.65} delayPressIn={0} style={[styles.toolbarButton, compact && styles.compact, disabled && styles.disabled, style]}>
      {typeof icon === 'string' ? <Text style={styles.actionIcon}>{icon}</Text> : icon}
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
  searchIcon: { width: 20, height: 20 },
  pinIcon: { width: 20, height: 20, alignItems: 'center', transform: [{ rotate: '28deg' }] },
  pinCap: { width: 12, height: 2.5, borderRadius: 1, backgroundColor: buttonColor },
  pinNeck: { width: 8, height: 7, borderLeftWidth: 1.5, borderRightWidth: 1.5, borderColor: buttonColor },
  pinFilled: { backgroundColor: buttonColor },
  pinShoulder: { width: 16, height: 3.5, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: buttonColor },
  pinStem: { width: 1.5, height: 7, borderRadius: 1, backgroundColor: buttonColor },
  lens: { width: 14, height: 14, borderWidth: 2, borderColor: buttonColor, borderRadius: 7 },
  handle: {
    position: 'absolute', left: 14, top: 11, width: 2, height: 9, borderRadius: 1,
    backgroundColor: buttonColor, transform: [{ rotate: '-45deg' }],
  },
  actionText: { flexShrink: 1, color: '#f7f9ff', fontWeight: '600', fontSize: 16 },
  track: { height: 5, backgroundColor: '#303c64', borderRadius: 3, overflow: 'hidden' },
  progress: { transformOrigin: 'left center', height: '100%', borderRadius: 3, backgroundColor: '#41baff' },
  compact: { minWidth: 46, alignSelf: 'center' },
  disabled: { opacity: 0.5 },
  destructive: { color: deleteButtonColor },
});
