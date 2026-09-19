import { useEffect, useState } from 'react';
import Slider from '@react-native-community/slider';
import { Alert, LayoutAnimation, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TimeWheel } from '@/components/time-wheel';
import { usePageMargin } from '@/hooks/use-page-margin';
import { Alarm, ChallengeType, loadAlarms, saveAlarms } from '@/services/storage';
import { colors, fonts, radius, spacing, type } from '@/theme';
import { requestAlarmPermissions, scheduleNativeAlarm } from '@/services/nativeAlarm';
import { useTranslation } from '@/i18n';

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const DAY_KEYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DEFAULT_DAYS = [false, true, true, true, true, true, false];

const CHALLENGES: { type: ChallengeType; icon: keyof typeof Ionicons.glyphMap; titleKey: 'mathPuzzleTitle' | 'shakePhoneTitle'; subtitleKey: 'solveEquations' | 'shakeToDismiss' }[] = [
  { type: 'math', icon: 'calculator-outline', titleKey: 'mathPuzzleTitle', subtitleKey: 'solveEquations' },
  { type: 'shake', icon: 'phone-portrait-outline', titleKey: 'shakePhoneTitle', subtitleKey: 'shakeToDismiss' },
];

export default function AlarmForm() {
  const { t } = useTranslation();
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
  const [mathDifficulty, setMathDifficulty] = useState<Alarm['mathDifficulty']>('easy');
  const [shakeCountTarget, setShakeCountTarget] = useState(30);
  const [volume, setVolume] = useState(80);
  const [sound, setSound] = useState<Alarm['sound']>('default');
  const [vibration, setVibration] = useState(true);


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
      setMathDifficulty(alarm.mathDifficulty);
      setShakeCountTarget(alarm.shakeCountTarget ?? 30);
      setVolume(alarm.volume ?? 80);
      setSound(alarm.sound ?? 'default');
      setVibration(alarm.vibration ?? true);
      setDays(DAY_KEYS.map((day, index) => alarm.days.includes(day) || alarm.days.includes(DAY_LETTERS[index])));
    });
  }, [alarmId]);

  const toggleDay = (index: number) => setDays((prev) => prev.map((value, i) => (i === index ? !value : value)));
  const choosePeriod = (option: 'AM' | 'PM') => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setPeriod(option); };

  const remove = () => {
    if (!alarmId) return;
    Alert.alert(t('deleteAlarmTitle'), t('deleteAlarmBody'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          const current = await loadAlarms();
          await saveAlarms(current.filter((alarm) => alarm.id !== alarmId));
          router.back();
        },
      },
    ]);
  };

  const save = async () => {
    if (!days.some(Boolean)) {
      Alert.alert(t('chooseDayTitle'), t('chooseDayBody'));
      return;
    }
    const hourNumber = Number(hour) % 12;
    const hour24 = period === 'AM' ? hourNumber : hourNumber + 12;
    const selectedDays = DAY_LETTERS.filter((_, i) => days[i]);
    const newAlarm: Alarm = {
      id: alarmId ?? `alarm-${Date.now()}`,
      time: `${String(hour24).padStart(2, '0')}:${minute}`,
      label: label.trim() || t('wakeUp'),
      enabled: true,
      challengeType,
      days: DAY_KEYS.filter((_, index) => days[index]),
      mathDifficulty,
      mathProblemCount: 2,
      shakeCountTarget,
      volume,
      sound,
      vibration,
    };
    const current = await loadAlarms();
    const next = isEditing ? current.map((alarm) => (alarm.id === newAlarm.id ? { ...alarm, ...newAlarm } : alarm)) : [...current, newAlarm];
    await saveAlarms(next);
    if (newAlarm.enabled) {
      const granted = await requestAlarmPermissions();
      if (granted) await scheduleNativeAlarm(newAlarm.id, hour24, Number(minute), DAY_KEYS.map((day, index) => days[index] ? index + 1 : 0).filter(Boolean), sound, vibration);
    }
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.header, { paddingHorizontal: margin, paddingTop: 28 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={styles.roundButton}>
          <Ionicons name="close" size={20} color={colors.ink} />
        </Pressable>
        <Text style={type.headline}>{isEditing ? t('editAlarm') : t('newAlarm')}</Text>
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
              <Pressable key={option} onPress={() => choosePeriod(option)} style={({ pressed }) => [styles.periodPill, period === option && styles.periodPillActive, pressed && styles.pressed]}>
                <Text style={[styles.periodText, period === option && styles.periodTextActive]}>{option}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={type.caption}>{t('repeat')}</Text>
          <View style={styles.days}>
            {DAY_LETTERS.map((letter, index) => (
              <Pressable key={`${letter}-${index}`} onPress={() => toggleDay(index)} style={({ pressed }) => [styles.day, days[index] && styles.dayActive, pressed && styles.pressed]}>
                <Text style={[styles.dayText, days[index] && styles.dayTextActive]}>{letter}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={type.caption}>{t('label')}</Text>
          <View style={styles.labelField}>
            <Ionicons name="pencil-outline" size={16} color={colors.label} />
            <TextInput
              value={label}
              onChangeText={setLabel}
              placeholder={t('labelPlaceholder')}
              placeholderTextColor={colors.label}
              style={styles.labelInput}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.challengeHeader}>
            <Text style={type.caption}>{t('wakeUpChallenge')}</Text>
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredText}>{t('required')}</Text>
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
                  <Text style={[styles.challengeTitle, isSelected && styles.challengeTitleActive]}>{t(challenge.titleKey)}</Text>
                  <Text style={[styles.challengeSubtitle, isSelected && styles.challengeSubtitleActive]}>{t(challenge.subtitleKey)}</Text>
                </View>
                {isSelected ? (
                  <View style={styles.checkCircle}>
                    <Ionicons name="checkmark" size={14} color={colors.ink} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
          {challengeType === 'math' ? (
            <View style={styles.difficultyCard}>
              <View style={styles.difficultyHeader}>
                <View style={styles.rowValue}><Ionicons name="flash-outline" size={16} color={colors.ink} /><Text style={styles.difficultyTitle}>{t('difficultyIntensity')}</Text></View>
                <Text style={styles.difficultyMode}>{mathDifficulty === 'easy' ? t('easyMode') : mathDifficulty === 'medium' ? t('mediumMode') : t('hardMode')}</Text>
              </View>
              <Text style={styles.difficultyLabel}>{t('mathComplexity')}</Text>
              <View style={styles.segmentedControl}>
                {(['easy', 'medium', 'hard'] as const).map((level) => <Pressable key={level} onPress={() => setMathDifficulty(level)} style={[styles.segment, mathDifficulty === level && styles.segmentActive]}><Text style={[styles.segmentText, mathDifficulty === level && styles.segmentTextActive]}>{t(level)}</Text></Pressable>)}
              </View>
            </View>
          ) : null}
          {challengeType === 'shake' ? (
            <View style={styles.difficultyCard}>
              <View style={styles.difficultyHeader}>
                <View style={styles.rowValue}><Ionicons name="flash-outline" size={16} color={colors.ink} /><Text style={styles.difficultyTitle}>{t('difficultyIntensity')}</Text></View>
                <Text style={styles.difficultyMode}>{shakeCountTarget} {t('Shakes')}</Text>
              </View>
              <Text style={styles.difficultyLabel}>{t('requiredShakes')}</Text>
              <View style={styles.segmentedControl}>
                {[15, 30, 50, 75].map((target) => <Pressable key={target} onPress={() => setShakeCountTarget(target)} style={[styles.segment, shakeCountTarget === target && styles.segmentActive]}><Text style={[styles.segmentText, shakeCountTarget === target && styles.segmentTextActive]}>{target} {t('shakes')}</Text></Pressable>)}
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.settingsCard}>
          <View style={styles.volumeHeader}>
            <View style={styles.rowValue}>
              <Ionicons name="volume-medium-outline" size={17} color={colors.ink} />
              <Text style={type.body}>{t('alarmVolume')}</Text>
            </View>
            <Text style={styles.volumeBadge}>{Math.round(volume)}%</Text>
          </View>
          <View style={styles.volumeControls}>
            <Pressable accessibilityRole="button" accessibilityLabel="Decrease alarm volume" onPress={() => setVolume((current) => Math.max(5, current - 5))} style={styles.volumeAdjust}>
              <Ionicons name="remove" size={16} color={colors.ink} />
            </Pressable>
            <Slider
              accessibilityLabel="Alarm volume"
              minimumValue={5}
              maximumValue={100}
              value={volume}
              onValueChange={setVolume}
              minimumTrackTintColor={colors.ink}
              maximumTrackTintColor="#D9D9D9"
              thumbTintColor={colors.ink}
              style={styles.volumeSlider}
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Increase alarm volume" onPress={() => setVolume((current) => Math.min(100, current + 5))} style={styles.volumeAdjust}>
              <Ionicons name="add" size={16} color={colors.ink} />
            </Pressable>
          </View>
          <Row label={t('sound')} value={sound === 'default' ? t('radarChimeOption') : sound === 'soft' ? t('softBellOption') : t('brightPulseOption')} onPress={() => setSound((current) => current === 'default' ? 'soft' : current === 'soft' ? 'bright' : 'default')} />
          <Row label={t('vibration')} value={vibration ? t('on') : t('off')} onPress={() => setVibration((current) => !current)} />
        </View>

        {isEditing ? (
          <Pressable onPress={remove} style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
            <Ionicons name="trash-outline" size={16} color="#D92D20" />
            <Text style={styles.deleteText}>{t('deleteAlarm')}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <Text style={type.body}>{label}</Text>
      <View style={styles.rowValue}>
        <Text style={type.subhead}>{value}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.label} />
      </View>
    </Pressable>
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
  difficultyCard: { backgroundColor: '#F8F8F8', borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  difficultyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  difficultyTitle: { ...type.caption, color: colors.ink, fontFamily: fonts.semibold },
  difficultyMode: { ...type.caption, color: colors.muted },
  difficultyLabel: { ...type.caption, color: colors.muted },
  segmentedControl: { flexDirection: 'row', backgroundColor: colors.disabled, borderRadius: radius.md, padding: 3, gap: 3 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.sm },
  segmentActive: { backgroundColor: colors.paper },
  segmentText: { ...type.caption, color: colors.muted },
  segmentTextActive: { color: colors.ink, fontFamily: fonts.semibold },
  settingsCard: { backgroundColor: '#F8F8F8', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  volumeHeader: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  volumeBadge: { ...type.caption, color: colors.ink, backgroundColor: colors.disabled, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  volumeControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  volumeSlider: { flex: 1, height: 40 },
  volumeAdjust: { width: 28, height: 28, borderRadius: radius.full, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  volumeTrack: { flex: 1, height: 5, borderRadius: radius.full, backgroundColor: '#D9D9D9', overflow: 'visible' },
  volumeFill: { height: 5, borderRadius: radius.full, backgroundColor: colors.ink },
  volumeThumb: { position: 'absolute', top: -5, width: 15, height: 15, marginLeft: -7, borderRadius: radius.full, backgroundColor: colors.ink },
  row: { minHeight: 52, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowValue: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  deleteButton: { minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FFF1F1', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  deleteText: { fontFamily: fonts.medium, fontSize: 13, color: '#D92D20' },
});
