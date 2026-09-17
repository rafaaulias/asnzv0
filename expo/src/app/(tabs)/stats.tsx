import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '@/components/app-screen';
import { colors, fonts, radius, spacing, type } from '@/theme';

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Stats() {
  return (
    <AppScreen>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Last 7 Days</Text>
          <View style={styles.fresh}><Ionicons name="checkmark-circle-outline" size={13} color={colors.ink} /><Text style={styles.freshText}>Fresh Start</Text></View>
        </View>
        <View style={styles.chart}>
          <View style={styles.gridLine} />
          <View style={[styles.gridLine, styles.gridLineMiddle]} />
          <View style={styles.bars}>
            {days.map((day, index) => <View key={day} style={styles.barColumn}><View style={[styles.bar, index === 3 && styles.barActive]} /><Text style={[styles.dayLabel, index === 3 && styles.dayLabelActive]}>{day}</Text></View>)}
          </View>
        </View>
        <Text style={styles.emptyCopy}>No alarms dismissed yet. Wake up with Anti-Snooze to build your streak!</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Challenge Efficiency</Text>
          <View style={styles.fresh}><Ionicons name="flash-outline" size={13} color={colors.ink} /><Text style={styles.freshText}>0s Avg Time</Text></View>
        </View>
        <Challenge icon="calculator-outline" title="Math Puzzle" subtitle="0 equations solved" />
        <Challenge icon="phone-portrait-outline" title="Shake Phone" subtitle="0 wake-up shakes" />
      </View>
    </AppScreen>
  );
}

function Challenge({ icon, title, subtitle }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }) {
  return <View style={styles.challenge}><View style={styles.challengeIcon}><Ionicons name={icon} size={18} color={colors.paper} /></View><View style={styles.challengeCopy}><Text style={styles.challengeTitle}>{title}</Text><Text style={styles.challengeSubtitle}>{subtitle}</Text></View><View style={styles.rate}><Text style={styles.rateValue}>0%</Text><Text style={styles.rateLabel}>Success Rate</Text></View></View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { ...type.headline, fontFamily: fonts.semibold },
  fresh: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  freshText: { ...type.caption, fontSize: 10, color: colors.muted },
  chart: { height: 106, position: 'relative' },
  gridLine: { position: 'absolute', left: 0, right: 0, top: 27, borderTopWidth: 1, borderColor: colors.borderSoft },
  gridLineMiddle: { top: 68 },
  bars: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: spacing.sm },
  barColumn: { alignItems: 'center', justifyContent: 'flex-end', gap: 7 },
  bar: { width: 10, height: 9, borderRadius: 5, backgroundColor: colors.disabled },
  barActive: { height: 20, backgroundColor: '#BFC0C0' },
  dayLabel: { ...type.caption, fontSize: 10, color: colors.faintText },
  dayLabelActive: { color: colors.ink, fontFamily: fonts.semibold },
  emptyCopy: { ...type.caption, fontSize: 10, textAlign: 'center', color: colors.muted, lineHeight: 15 },
  challenge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.md, padding: spacing.sm, gap: spacing.sm },
  challengeIcon: { width: 32, height: 32, borderRadius: 9, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  challengeCopy: { flex: 1 },
  challengeTitle: { ...type.caption, color: colors.ink, fontFamily: fonts.semibold },
  challengeSubtitle: { ...type.caption, fontSize: 10, color: colors.faintText },
  rate: { alignItems: 'flex-end' },
  rateValue: { ...type.caption, color: colors.ink, fontFamily: fonts.semibold },
  rateLabel: { ...type.caption, fontSize: 9, color: colors.faintText },
});
