import { StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '@/components/app-screen';
import { colors, radius, shadow, spacing, type } from '@/theme';

export default function Stats() {
  return (
    <AppScreen>
      <Text style={type.largeTitle}>Your progress</Text>
      <Text style={styles.sub}>Build a better morning, one wake-up at a time.</Text>
      <View style={styles.heroCard}><Text style={styles.heroValue}>0</Text><Text style={styles.heroLabel}>days on your current streak</Text><View style={styles.track}><View style={styles.trackFill} /></View></View>
      <Text style={styles.sectionTitle}>This week</Text>
      <View style={styles.grid}>
        <Metric value="0" label="alarms completed" />
        <Metric value="—" label="average wake time" />
        <Metric value="0" label="challenges solved" />
        <Metric value="100%" label="on-device privacy" />
      </View>
    </AppScreen>
  );
}

function Metric({ value, label }: { value: string; label: string }) { return <View style={styles.metric}><Text style={styles.value}>{value}</Text><Text style={styles.label}>{label}</Text></View>; }

const styles = StyleSheet.create({
  sub: { ...type.subhead, marginTop: -spacing.sm },
  heroCard: { backgroundColor: colors.ink, borderRadius: radius.lg, padding: spacing.lg, ...shadow.card },
  heroValue: { color: colors.paper, fontSize: 52, fontWeight: '600', letterSpacing: -2 },
  heroLabel: { ...type.subhead, color: '#BDBDBD' },
  track: { height: 6, borderRadius: radius.full, backgroundColor: '#2D2D2D', overflow: 'hidden', marginTop: spacing.lg },
  trackFill: { width: '12%', height: '100%', backgroundColor: colors.paper, borderRadius: radius.full },
  sectionTitle: { ...type.headline, marginTop: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metric: { width: '46%', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md },
  value: { fontSize: 28, fontWeight: '600', color: colors.ink },
  label: { ...type.caption, marginTop: spacing.xs },
});
