import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOP_NAV_HEIGHT, TopNav } from '@/components/top-nav';
import { BOTTOM_NAV_HEIGHT } from '@/components/bottom-tab-bar';
import { usePageMargin } from '@/hooks/use-page-margin';
import { colors } from '@/theme';

type AppScreenProps = PropsWithChildren<{
  onAddPress?: () => void;
  scroll?: boolean;
}>;

// Every tab screen shares this shell: the floating top nav, a horizontal
// margin equal to the nav's own inset, and enough top/bottom clearance so
// content never sits under either floating pill.
export function AppScreen({ children, onAddPress, scroll = true }: AppScreenProps) {
  const insets = useSafeAreaInsets();
  const margin = usePageMargin();
  const contentStyle = [
    styles.content,
    {
      paddingHorizontal: margin,
      paddingTop: insets.top + TOP_NAV_HEIGHT + 12,
      paddingBottom: insets.bottom + BOTTOM_NAV_HEIGHT + 12,
    },
  ];

  return (
    <View style={styles.root}>
      <TopNav onAddPress={onAddPress} />
      {scroll ? (
        <ScrollView contentContainerStyle={contentStyle}>{children}</ScrollView>
      ) : (
        <View style={contentStyle}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  content: { gap: 16, flexGrow: 1 },
});
