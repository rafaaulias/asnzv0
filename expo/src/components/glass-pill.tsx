import type { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { nav, radius } from '@/theme';

type GlassPillProps = PropsWithChildren<{
  height: number;
  shadow: ViewStyle;
  style?: StyleProp<ViewStyle>;
}>;

// Shared "liquid glass" pill shell: blurred background, a thin low-opacity
// stroke, and a soft low-opacity shadow. Used by both the top nav and the
// bottom tab bar so their chrome stays visually consistent.
export function GlassPill({ children, height, shadow, style }: GlassPillProps) {
  return (
    <View style={[{ height, borderRadius: radius.full }, shadow, style]}>
      <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.tint]} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  tint: {
    borderRadius: radius.full,
    backgroundColor: nav.glassTint,
    borderWidth: 1,
    borderColor: nav.glassBorder,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    borderRadius: radius.full,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
});
