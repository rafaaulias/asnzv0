import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AppScreen } from '@/components/app-screen';
import { colors, fonts, radius, shadow, spacing, type } from '@/theme';
import { Alarm, loadAlarms, saveAlarms } from '@/services/storage';

function formatTime(time24: string) {
  const [hourRaw, minute] = time24.split(':');
  const hour = Number(hourRaw);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return { hour: String(hour12).padStart(2, '0'), minute, period };
}

function minutesUntil(time24: string) {
  const [hour, minute] = time24.split(':').map(Number);
  const now = new Date();
  const target = new Date(now);
  target.setHours(hour, minute, 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  return Math.round((target.getTime() - now.getTime()) / 60000);
}

function formatCountdown(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function challengeSummary(alarm: Alarm) {
  return alarm.challengeType === 'math' ? `Math puzzle · ${alarm.mathDifficulty}` : `Shake to wake · ${alarm.shakeCountTarget}x`;
}

function AlarmCard({ alarm, onToggle, onPress, onTest }: { alarm: Alarm; onToggle: (value: boolean) => void; onPress: () => void; onTest: () => void }) {
  const { hour, minute, period } = formatTime(alarm.time);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, !alarm.enabled && styles.cardInactive, pressed && { opacity: 0.85 }]}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <View style={styles.timeRow}>
            <Text style={styles.time}>{hour}:{minute}</Text>
            <Text style={styles.period}>{period}</Text>
          </View>
          <Text style={styles.label}>
            {alarm.label} · {challengeSummary(alarm)}
          </Text>
        </View>
        <Switch value={alarm.enabled} onValueChange={onToggle} trackColor={{ false: colors.disabled, true: colors.ink }} thumbColor={colors.paper} />
      </View>
      <View style={styles.divider} />
      <View style={styles.cardBottom}>
        <View style={styles.days}>
          {alarm.days.map((day, index) => (
            <View key={`${day}-${index}`} style={[styles.day, alarm.enabled && styles.dayActive]}>
              <Text style={[styles.dayText, alarm.enabled && styles.dayTextActive]}>{day}</Text>
            </View>
          ))}
        </View>
        <Pressable onPress={onTest} hitSlop={8} style={styles.testButton} accessibilityRole="button" accessibilityLabel={`Test ${alarm.label} alarm`}>
          <Ionicons name="play" size={10} color={alarm.enabled ? colors.label : colors.faintText} />
          <Text style={[styles.test, !alarm.enabled && styles.inactiveText]}>Test</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

export default function AlarmsScreen() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const router = useRouter();

  useEffect(() => {
    loadAlarms().then(setAlarms);
  }, []);

  const toggle = (id: string, enabled: boolean) => {
    const next = alarms.map((alarm) => (alarm.id === id ? { ...alarm, enabled } : alarm));
    setAlarms(next);
    saveAlarms(next);
  };

  const active = alarms.filter((alarm) => alarm.enabled);
  const inactive = alarms.filter((alarm) => !alarm.enabled);
  const nextIn = active.length ? formatCountdown(Math.min(...active.map((alarm) => minutesUntil(alarm.time)))) : null;

  return (
    <AppScreen onAddPress={() => router.push('/alarm-form' as never)}>
      <View style={styles.sectionHeader}>
        <Text style={type.subhead}>Active</Text>
        {nextIn ? <Text style={type.subhead}>Next: {nextIn}</Text> : null}
      </View>
      {active.length === 0 ? (
        <Text style={styles.empty}>No active alarms. Tap + above to create or toggle an alarm on.</Text>
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
            <Text style={type.subhead}>Inactive</Text>
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
