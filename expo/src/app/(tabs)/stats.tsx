import { StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '@/components/app-screen';
import { colors, radius, spacing, type } from '@/theme';

export default function Stats() {
  return (
    <AppScreen>
      <Text style={type.largeTitle}>Stats</Text>
      <Text style={styles.sub}>Your consistency, measured locally.</Text>
      <View style={styles.grid}>
        <View style={styles.metric}>
          <Text style={styles.value}>0</Text>
          <Text style={styles.label}>day streak</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.value}>—</Text>
          <Text style={styles.label}>avg wake time</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.value}>0</Text>
          <Text style={styles.label}>challenges solved</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.value}>100%</Text>
          <Text style={styles.label}>privacy</Text>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  sub: { ...type.subhead },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metric: { width: '46%', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md },
  value: { fontSize: 30, fontWeight: '800', color: colors.ink },
  label: { ...type.caption, marginTop: spacing.xs },
});
