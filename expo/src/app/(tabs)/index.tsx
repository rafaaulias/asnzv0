import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useRouter } from 'expo-router';
import { AppScreen } from '@/components/app-screen';
import { colors, fonts, radius, shadow, spacing, type } from '@/theme';
import { Alarm, loadAlarms, saveAlarms } from '@/services/storage';
import { Haptics } from '@/services/feedback';
import { cancelNativeAlarm, dayToWeekday, requestAlarmPermissions, scheduleNativeAlarm } from '@/services/nativeAlarm';
import { DAY_KEYS, useTranslation } from '@/i18n';

function formatTime(time24: string) {
  const [hourRaw, minute] = time24.split(':');
  const hour = Number(hourRaw);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return { hour: String(hour12).padStart(2, '0'), minute, period };
}

function minutesUntil(time24: string, days: string[]) {
  const [hour, minute] = time24.split(':').map(Number);
  const now = new Date();
  const selected = new Set(days);
  let best = Number.POSITIVE_INFINITY;
  for (let offset = 0; offset < 7; offset += 1) {
    const target = new Date(now);
    target.setDate(now.getDate() + offset);
    target.setHours(hour, minute, 0, 0);
    const weekday = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][target.getDay()];
    if (selected.has(weekday) && target.getTime() > now.getTime()) best = Math.min(best, Math.round((target.getTime() - now.getTime()) / 60000));
  }
  return best;
}

function formatCountdown(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function challengeSummary(alarm: Alarm, mathLabel: string, shakeLabel: string) {
  return alarm.challengeType === 'math' ? `${mathLabel} · ${alarm.mathDifficulty}` : `${shakeLabel} · ${alarm.shakeCountTarget}x`;
}

function AlarmCard({ alarm, onToggle, onPress, onTest }: { alarm: Alarm; onToggle: (value: boolean) => void; onPress: () => void; onTest: () => void }) {
  const { t, dayLabels } = useTranslation();
  const { hour, minute, period } = formatTime(alarm.time);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, !alarm.enabled && styles.cardInactive, pressed && { opacity: 0.85 }]}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <View style={styles.timeRow}>
            <Text style={[styles.time, !alarm.enabled && styles.inactiveTime]}>{hour}:{minute}</Text>
            <Text style={styles.period}>{period}</Text>
          </View>
          <Text style={styles.label}>
            {alarm.label} · {challengeSummary(alarm, t('mathPuzzle'), t('shakeToWake'))}
          </Text>
        </View>
        <Switch value={alarm.enabled} onValueChange={onToggle} trackColor={{ false: colors.disabled, true: colors.ink }} thumbColor={colors.paper} />
      </View>
      <View style={styles.divider} />
      <View style={styles.cardBottom}>
        <View style={styles.days}>
          {alarm.days.map((day, index) => (
            <View key={`${day}-${index}`} style={[styles.day, alarm.enabled && styles.dayActive]}>
              <Text style={[styles.dayText, alarm.enabled && styles.dayTextActive]}>{dayLabels[DAY_KEYS.indexOf(day as (typeof DAY_KEYS)[number])] ?? day}</Text>
            </View>
          ))}
        </View>
        <Pressable onPress={onTest} hitSlop={8} style={styles.testButton} accessibilityRole="button" accessibilityLabel={`Test ${alarm.label} alarm`}>
          <Ionicons name="play" size={10} color={alarm.enabled ? colors.label : colors.faintText} />
          <Text style={[styles.test, !alarm.enabled && styles.inactiveText]}>{t('test')}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

export default function AlarmsScreen() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [tick, setTick] = useState(0);
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    const interval = setInterval(() => setTick((value) => value + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      loadAlarms().then(async (items) => {
        const sorted = [...items].sort((a, b) => minutesUntil(a.time, a.days) - minutesUntil(b.time, b.days));
        if (mounted) setAlarms(sorted);
        const granted = await requestAlarmPermissions();
        if (granted) await Promise.all(sorted.filter((alarm) => alarm.enabled).map((alarm) => { const [hour, minute] = alarm.time.split(':').map(Number); return scheduleNativeAlarm(alarm.id, hour, minute, alarm.days.map(dayToWeekday).filter((day) => day >= 0), alarm.sound, alarm.vibration); }));
      });
      return () => {
        mounted = false;
      };
    }, []),
  );

  const toggle = (id: string, enabled: boolean) => {
  Haptics.light();
  const alarm = alarms.find((item) => item.id === id);
  const next = alarms.map((item) => (item.id === id ? { ...item, enabled } : item));
  setAlarms(next);
  saveAlarms(next);
  if (alarm) {
    const [hour, minute] = alarm.time.split(':').map(Number);
    if (enabled) requestAlarmPermissions().then((granted) => { if (granted) void scheduleNativeAlarm(alarm.id, hour, minute, alarm.days.map(dayToWeekday).filter((day) => day >= 0), alarm.sound, alarm.vibration); });
    else cancelNativeAlarm(alarm.id).catch(() => undefined);
  }
  };

  const active = alarms.filter((alarm) => alarm.enabled);
  const inactive = alarms.filter((alarm) => !alarm.enabled);
  const nextMinutes = active.length ? Math.min(...active.map((alarm) => minutesUntil(alarm.time, alarm.days))) : null;
  const nextIn = nextMinutes !== null && Number.isFinite(nextMinutes) ? formatCountdown(nextMinutes) : null;
  void tick;

  return (
    <AppScreen onAddPress={() => router.push('/alarm-form' as never)}>
      <View style={styles.sectionHeader}>
        <Text style={type.subhead}>{t('active')}</Text>
        {nextIn ? <Text style={type.subhead}>{t('next')}: {nextIn}</Text> : null}
      </View>
      {active.length === 0 ? (
        <Text style={styles.empty}>{t('noActiveAlarms')}</Text>
      ) : (
        active.map((alarm) => (
          <AlarmCard
            key={alarm.id}
            alarm={alarm}
            onToggle={(value) => toggle(alarm.id, value)}
            onPress={() => router.push({ pathname: '/alarm-form', params: { alarmId: alarm.id } })}
            onTest={() => router.push({ pathname: '/active-alarm', params: { alarmId: alarm.id } })}
          />
        ))
      )}

      {inactive.length > 0 ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={type.subhead}>{t('inactive')}</Text>
          </View>
          {inactive.map((alarm) => (
            <AlarmCard
              key={alarm.id}
              alarm={alarm}
              onToggle={(value) => toggle(alarm.id, value)}
              onPress={() => router.push({ pathname: '/alarm-form', params: { alarmId: alarm.id } })}
              onTest={() => router.push({ pathname: '/active-alarm', params: { alarmId: alarm.id } })}
            />
          ))}
        </>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  empty: { ...type.subhead, textAlign: 'center', paddingVertical: spacing.xl },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  cardInactive: { backgroundColor: '#F4F4F4', borderColor: '#E8E8E8', shadowOpacity: 0.02 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  timeRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  time: { fontSize: 44, fontWeight: '600', fontFamily: fonts.semibold, color: colors.ink, letterSpacing: -2 },
  inactiveTime: { color: colors.muted },
  period: { ...type.caption },
  label: { ...type.subhead, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  days: { flexDirection: 'row', gap: 5 },
  day: { width: 25, height: 25, borderRadius: 13, backgroundColor: colors.dayInactiveBg, alignItems: 'center', justifyContent: 'center' },
  dayActive: { backgroundColor: colors.ink },
  dayText: { fontSize: 10, fontWeight: '800', color: colors.dayInactiveText },
  dayTextActive: { color: colors.paper },
  testButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.full, backgroundColor: colors.paper },
  test: { ...type.caption, fontSize: 11 },
  inactiveText: { color: colors.faintText },
});
