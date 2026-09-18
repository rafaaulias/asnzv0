import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassPill } from '@/components/glass-pill';
import { usePageMargin } from '@/hooks/use-page-margin';
import { colors, nav } from '@/theme';

const logo = require('../../assets/logo.png');

type TopNavProps = {
  onAddPress?: () => void;
};

// Sticky top pill: logo on the left, an optional plain (no background)
// black "+" on the right. Floats above screen content on every tab.
export function TopNav({ onAddPress }: TopNavProps) {
  const insets = useSafeAreaInsets();
  const margin = usePageMargin();

  return (
    <View style={[styles.wrap, { top: insets.top + 20, left: margin, right: margin }]} pointerEvents="box-none">
      <GlassPill height={nav.pillHeight} shadow={nav.topShadow} style={styles.row}>
        <Image source={logo} style={styles.logo} contentFit="contain" />
        <View style={{ flex: 1 }} />
        {onAddPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add alarm"
            onPress={onAddPress}
            hitSlop={12}
            style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="add" size={26} color={colors.ink} />
          </Pressable>
        ) : null}
      </GlassPill>
    </View>
  );
}

export const TOP_NAV_HEIGHT = nav.pillHeight + 18;

const styles = StyleSheet.create({
  wrap: { position: 'absolute', zIndex: 10 },
  row: { paddingHorizontal: 12, paddingVertical: 8 },
  logo: { width: 50, height: 50 },
  addButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
