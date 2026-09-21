import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { AppScreen } from '@/components/app-screen';
import { colors, fonts, radius, spacing, type } from '@/theme';
import { loadCompletionStats, loadWakeStreak } from '@/services/storage';
import { useTranslation } from '@/i18n';

export default function Stats() {
  const { t, weekLabels } = useTranslation();
  const days = weekLabels;
  const [streak, setStreak] = useState(0);
  const [stats, setStats] = useState({ dates: [false, false, false, false, false, false, false], math: 0, shake: 0, averageSeconds: 0, mathAvgSeconds: 0, shakeAvgSeconds: 0 });
  useFocusEffect(useCallback(() => {
    loadWakeStreak().then(setStreak);
    loadCompletionStats().then(setStats);
  }, []));

  return (
    <AppScreen>
      <View style={styles.streakCard}>
        <Ionicons name="flame" size={58} color={streak > 0 ? '#ff7b00' : colors.muted} />
        <Text style={[styles.streakLabel, streak > 0 && styles.streakActive]}>{t('wakeStreak')}</Text>
        <Text style={[styles.streakValue, streak > 0 && styles.streakActive]}>{streak} {streak === 1 ? t('day') : t('days')}</Text>
      </View>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{t('last7Days')}</Text>
          <View style={styles.fresh}><Ionicons name="checkmark-circle-outline" size={13} color={colors.ink} /><Text style={styles.freshText}>{t('freshStart')}</Text></View>
        </View>
        <View style={styles.chart}>
          <View style={styles.gridLine} />
          <View style={[styles.gridLine, styles.gridLineMiddle]} />
          <View style={styles.bars}>
            {days.map((day, index) => <View key={day} style={styles.barColumn}><View style={[styles.bar, stats.dates[index] && styles.barActive]} /><Text style={[styles.dayLabel, stats.dates[index] && styles.dayLabelActive]}>{day}</Text></View>)}
          </View>
        </View>
        <Text style={styles.emptyCopy}>{stats.dates.some(Boolean) ? t('wakeHistoryFilled') : t('noAlarmsYet')}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{t('challengeEfficiency')}</Text>
          <View style={styles.fresh}><Ionicons name="flash-outline" size={13} color={colors.ink} /><Text style={styles.freshText}>{stats.averageSeconds}s {t('avgTime')}</Text></View>
        </View>
        <Challenge icon="calculator-outline" title={t('mathPuzzleTitle')} subtitle={`${stats.math} ${t('challengeCompletions')}`} metric={`${stats.mathAvgSeconds}s`} />
        <Challenge icon="phone-portrait-outline" title={t('shakePhoneTitle')} subtitle={`${stats.shake} ${t('challengeCompletions')}`} metric={`${stats.shakeAvgSeconds}s`} />
      </View>
    </AppScreen>
  );
}

// Success rate is not computable — only completions are recorded, never failed
// attempts — so each challenge shows its real average completion time instead.
function Challenge({ icon, title, subtitle, metric }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; metric: string }) {
  const { t } = useTranslation();
  return <View style={styles.challenge}><View style={styles.challengeIcon}><Ionicons name={icon} size={18} color={colors.paper} /></View><View style={styles.challengeCopy}><Text style={styles.challengeTitle}>{title}</Text><Text style={styles.challengeSubtitle}>{subtitle}</Text></View><View style={styles.rate}><Text style={styles.rateValue}>{metric}</Text><Text style={styles.rateLabel}>{t('avgTime')}</Text></View></View>;
}

const styles = StyleSheet.create({
  streakCard: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingVertical: spacing.md, alignItems: 'center', gap: 2 },
  streakLabel: { ...type.subhead, color: colors.muted },
  streakValue: { fontSize: 34, fontWeight: '700', fontFamily: fonts.semibold, color: colors.ink },
  streakActive: { color: '#ff7b00' },
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
