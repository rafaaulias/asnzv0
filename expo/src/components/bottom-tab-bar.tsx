import { useEffect, useRef } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassPill } from '@/components/glass-pill';
import { usePageMargin } from '@/hooks/use-page-margin';
import { colors, fonts, nav, radius } from '@/theme';

const ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  index: { active: 'alarm', inactive: 'alarm-outline' },
  stats: { active: 'bar-chart', inactive: 'bar-chart-outline' },
  settings: { active: 'settings', inactive: 'settings-outline' },
};

const LABELS: Record<string, string> = { index: 'Alarms', stats: 'Stats', settings: 'Settings' };

// Sticky bottom pill: liquid-glass background, a heavier shadow than the top
// nav, and a black pill that slides behind whichever tab is active. Tab
// switches never slide the page content — only this indicator animates.
export function BottomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const margin = usePageMargin();
  const layouts = useRef<{ x: number; width: number }[]>([]);
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);

  const measure = (index: number, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    layouts.current[index] = { x, width };
    if (index === state.index && indicatorWidth.get() === 0) {
      indicatorX.set(x);
      indicatorWidth.set(width);
    }
  };

  useEffect(() => {
    const target = layouts.current[state.index];
    if (!target) return;
    indicatorX.set(withSpring(target.x, { damping: 13, stiffness: 140, mass: 1.1 }));
    indicatorWidth.set(withSpring(target.width, { damping: 13, stiffness: 140, mass: 1.1 }));
  }, [state.index]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.get() }],
    width: indicatorWidth.get(),
  }));

  return (
    <View style={[styles.wrap, { left: margin, right: margin, bottom: insets.bottom + 12 }]} pointerEvents="box-none">
      <GlassPill height={nav.bottomPillHeight} shadow={nav.bottomShadow} style={styles.row}>
        <Animated.View style={[styles.indicator, indicatorStyle]} />
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const icon = ICONS[route.name] ?? ICONS.index;
          const label = (descriptors[route.key]?.options.title as string | undefined) ?? LABELS[route.name] ?? route.name;
          return (
            <Pressable
              key={route.key}
              onLayout={(event) => measure(index, event)}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={label}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={styles.tab}
            >
              <Ionicons name={isFocused ? icon.active : icon.inactive} size={18} color={isFocused ? colors.paper : colors.muted} />
              <Text style={[styles.label, { color: isFocused ? colors.paper : colors.muted }]}>{label}</Text>
            </Pressable>
          );
        })}
      </GlassPill>
    </View>
  );
}

export const BOTTOM_NAV_HEIGHT = nav.bottomPillHeight + 24;

const styles = StyleSheet.create({
  wrap: { position: 'absolute', zIndex: 10 },
  row: { paddingHorizontal: 8, paddingVertical: 13 },
  indicator: { position: 'absolute', top: 6, bottom: 6, left: 0, borderRadius: radius.full, backgroundColor: colors.ink },
  tab: { flex: 1, height: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  label: { fontSize: 12, fontWeight: '500', fontFamily: fonts.medium },
});
