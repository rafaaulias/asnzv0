import { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TimeWheel } from '@/components/time-wheel';
import { usePageMargin } from '@/hooks/use-page-margin';
import { Alarm, ChallengeType, loadAlarms, saveAlarms } from '@/services/storage';
import { colors, fonts, radius, spacing, type } from '@/theme';

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DEFAULT_DAYS = [false, true, true, true, true, true, false];

const CHALLENGES: { type: ChallengeType; icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }[] = [
  { type: 'math', icon: 'calculator-outline', title: 'Math Puzzle', subtitle: 'Solve equations to silence the alarm' },
  { type: 'shake', icon: 'phone-portrait-outline', title: 'Shake Phone', subtitle: 'Shake your phone to dismiss it' },
];

export default function AlarmForm() {
  const router = useRouter();
  const { alarmId } = useLocalSearchParams<{ alarmId?: string }>();
  const margin = usePageMargin();
  const isEditing = Boolean(alarmId);
  const [hour, setHour] = useState('06');
  const [minute, setMinute] = useState('30');
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const [days, setDays] = useState<boolean[]>(DEFAULT_DAYS);
  const [label, setLabel] = useState('');
  const [challengeType, setChallengeType] = useState<ChallengeType>('math');

  useEffect(() => {
    if (!alarmId) return;
    loadAlarms().then((items) => {
      const alarm = items.find((item) => item.id === alarmId);
      if (!alarm) return;
      const [hour24, minuteValue] = alarm.time.split(':').map(Number);
      setHour(String(hour24 % 12 || 12).padStart(2, '0'));
      setMinute(String(minuteValue).padStart(2, '0'));
      setPeriod(hour24 >= 12 ? 'PM' : 'AM');
      setLabel(alarm.label);
      setChallengeType(alarm.challengeType);
      setDays(DAY_LETTERS.map((day) => alarm.days.includes(day)));
    });
  }, [alarmId]);

  const toggleDay = (index: number) => setDays((prev) => prev.map((value, i) => (i === index ? !value : value)));

  const save = async () => {
    const hourNumber = Number(hour) % 12;
    const hour24 = period === 'AM' ? hourNumber : hourNumber + 12;
    const selectedDays = DAY_LETTERS.filter((_, i) => days[i]);
    const newAlarm: Alarm = {
      id: alarmId ?? `alarm-${Date.now()}`,
      time: `${String(hour24).padStart(2, '0')}:${minute}`,
      label: label.trim() || 'Wake Up',
      enabled: true,
      challengeType,
      days: selectedDays,
      mathDifficulty: 'easy',
      mathProblemCount: 2,
      shakeCountTarget: 30,
      volume: 80,
    };
    const current = await loadAlarms();
    const next = isEditing ? current.map((alarm) => (alarm.id === newAlarm.id ? { ...alarm, ...newAlarm } : alarm)) : [...current, newAlarm];
    await saveAlarms(next);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.header, { paddingHorizontal: margin, paddingTop: 8 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={styles.roundButton}>
          <Ionicons name="close" size={20} color={colors.ink} />
        </Pressable>
        <Text style={type.headline}>{isEditing ? 'Edit Alarm' : 'New Alarm'}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Save alarm" onPress={save} style={[styles.roundButton, styles.saveButton]}>
          <Ionicons name="checkmark" size={20} color={colors.paper} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: margin }]}>
        <View style={styles.timePicker}>
          <View style={styles.wheels}>
            <TimeWheel values={HOURS} value={hour} onChange={setHour} />
            <Text style={styles.colon}>:</Text>
            <TimeWheel values={MINUTES} value={minute} onChange={setMinute} />
          </View>
          <View style={styles.periodToggle}>
            {(['AM', 'PM'] as const).map((option) => (
              <Pressable key={option} onPress={() => setPeriod(option)} style={({ pressed }) => [styles.periodPill, period === option && styles.periodPillActive, pressed && styles.pressed]}>
                <Text style={[styles.periodText, period === option && styles.periodTextActive]}>{option}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={type.caption}>REPEAT</Text>
          <View style={styles.days}>
            {DAY_LETTERS.map((letter, index) => (
              <Pressable key={`${letter}-${index}`} onPress={() => toggleDay(index)} style={({ pressed }) => [styles.day, days[index] && styles.dayActive, pressed && styles.pressed]}>
                <Text style={[styles.dayText, days[index] && styles.dayTextActive]}>{letter}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={type.caption}>LABEL</Text>
          <View style={styles.labelField}>
            <Ionicons name="pencil-outline" size={16} color={colors.label} />
            <TextInput
              value={label}
              onChangeText={setLabel}
              placeholder="e.g. Work, Gym, School"
              placeholderTextColor={colors.label}
              style={styles.labelInput}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.challengeHeader}>
            <Text style={type.caption}>WAKE-UP CHALLENGE</Text>
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredText}>Required</Text>
            </View>
          </View>
          {CHALLENGES.map((challenge) => {
            const isSelected = challenge.type === challengeType;
            return (
              <Pressable
                key={challenge.type}
                onPress={() => setChallengeType(challenge.type)}
                style={[styles.challengeCard, isSelected && styles.challengeCardActive]}
              >
                <Ionicons name={challenge.icon} size={22} color={isSelected ? colors.paper : colors.ink} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.challengeTitle, isSelected && styles.challengeTitleActive]}>{challenge.title}</Text>
                  <Text style={[styles.challengeSubtitle, isSelected && styles.challengeSubtitleActive]}>{challenge.subtitle}</Text>
                </View>
                {isSelected ? (
                  <View style={styles.checkCircle}>
                    <Ionicons name="checkmark" size={14} color={colors.ink} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.section}>
          <Row label="Sound" value="Radar" />
          <Row label="Vibrate" value="Default" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={type.body}>{label}</Text>
      <View style={styles.rowValue}>
        <Text style={type.subhead}>{value}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.label} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  roundButton: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  saveButton: { backgroundColor: colors.ink, borderColor: colors.ink },
  content: { gap: spacing.xl, paddingBottom: spacing.xxl },
  timePicker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingTop: spacing.md },
  pressed: { opacity: 0.72 },
  wheels: { flexDirection: 'row', alignItems: 'center' },
  colon: { fontSize: 32, fontWeight: '500', fontFamily: fonts.medium, color: colors.ink, marginHorizontal: 4 },
  periodToggle: { gap: 6 },
  periodPill: { width: 52, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  periodPillActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  periodText: { fontSize: 13, fontWeight: '500', fontFamily: fonts.medium, color: colors.label },
  periodTextActive: { color: colors.paper },
  section: { gap: spacing.sm },
  days: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.dayInactiveBg, alignItems: 'center', justifyContent: 'center' },
  dayActive: { backgroundColor: colors.ink },
  dayText: { fontSize: 13, fontWeight: '500', fontFamily: fonts.medium, color: colors.dayInactiveText },
  dayTextActive: { color: colors.paper },
  labelField: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 52 },
  labelInput: { flex: 1, ...type.body },
  challengeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  requiredBadge: { backgroundColor: colors.disabled, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  requiredText: { fontSize: 11, fontWeight: '700', color: colors.label },
  challengeCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md },
  challengeCardActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  challengeTitle: { ...type.headline },
  challengeTitleActive: { color: colors.paper },
  challengeSubtitle: { ...type.caption, marginTop: 2 },
  challengeSubtitleActive: { color: '#D7D7D7' },
  checkCircle: { width: 26, height: 26, borderRadius: radius.full, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  row: { minHeight: 56, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowValue: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
