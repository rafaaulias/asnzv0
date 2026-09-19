import { useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, radius, spacing, type } from '@/theme';
import { Alarm, createMathProblem, loadAlarms } from '@/services/storage';
import { playSoundEffect } from '@/services/sound-effects';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'];

export default function Challenge() {
  const router = useRouter();
  const { alarmId } = useLocalSearchParams<{ alarmId?: string }>();
  const [alarm, setAlarm] = useState<Alarm>();
  const [answer, setAnswer] = useState('');
  const [problemIndex, setProblemIndex] = useState(0);
  const [shakeCount, setShakeCount] = useState(0);
  const [error, setError] = useState(false);

  const isMath = alarm?.challengeType !== 'shake';
  const problem = useMemo(() => createMathProblem(alarm?.mathDifficulty ?? 'easy'), [alarm?.mathDifficulty, problemIndex]);
  const problemCount = alarm?.mathProblemCount ?? 2;
  const shakeTarget = alarm?.shakeCountTarget ?? 30;

  useEffect(() => {
    loadAlarms().then((items) => setAlarm(items.find((item) => item.id === alarmId) ?? items[0]));
  }, [alarmId]);

  useEffect(() => {
    if (alarm?.challengeType !== 'shake') return;
    Accelerometer.setUpdateInterval(100);
    let lastShakeAt = 0;
    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();
      if (magnitude <= 1.8 || now - lastShakeAt <= 200) return;
      lastShakeAt = now;
      setShakeCount((count) => {
        const next = Math.min(shakeTarget, count + 1);
        if (next >= shakeTarget) router.replace('/success');
        return next;
      });
    });
    return () => subscription.remove();
  }, [alarm?.challengeType, router, shakeTarget]);

  const submitAnswer = () => {
    if (Number(answer) !== problem.answer) {
      setError(true);
      setAnswer('');
      return;
    }
    if (problemIndex + 1 >= problemCount) {
      router.replace('/success');
      return;
    }
    setProblemIndex((index) => index + 1);
    setAnswer('');
  };

  const enterDigit = (value: string) => {
    setError(false);
    if (answer.length < 5) setAnswer((current) => current + value);
  };

  const handleKey = (key: string) => {
    void playSoundEffect('keyboard');
    if (key === 'C') setAnswer('');
    else if (key === '⌫') setAnswer((current) => current.slice(0, -1));
    else enterDigit(key);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={type.headline}>{isMath ? 'Math puzzle' : 'Shake challenge'}</Text>
        <Text style={type.caption}>{isMath ? `${problemIndex + 1} / ${problemCount}` : `${shakeCount} / ${shakeTarget}`}</Text>
      </View>
      {isMath ? <MathChallenge answer={answer} error={error} problem={problem} onKey={handleKey} onSubmit={submitAnswer} /> : <ShakeChallenge count={shakeCount} target={shakeTarget} />}
    </SafeAreaView>
  );
}

function MathChallenge({ answer, error, problem, onKey, onSubmit }: { answer: string; error: boolean; problem: { question: string; answer: number }; onKey: (key: string) => void; onSubmit: () => void }) {
  return (
    <View style={styles.body}>
      <Text style={styles.eyebrow}>SOLVE TO DISMISS</Text>
      <Text style={styles.question}>{problem.question}</Text>
      <View style={[styles.answer, error && styles.answerError]}><Text style={styles.answerText}>{answer || (error ? 'Try again' : '...')}</Text></View>
      <View style={styles.grid}>{KEYS.map((key) => <Pressable key={key} onPress={() => onKey(key)} style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}><Text style={styles.keyText}>{key}</Text></Pressable>)}</View>
      <Pressable disabled={!answer} onPress={onSubmit} style={[styles.submit, !answer && styles.disabled]}><Text style={styles.submitText}>Submit answer</Text></Pressable>
    </View>
  );
}

function ShakeChallenge({ count, target }: { count: number; target: number }) {
  return <View style={styles.body}><View style={styles.shakeCircle}><Text style={styles.percent}>{Math.round((count / target) * 100)}%</Text><Text style={styles.shakeLabel}>{count} / {target}</Text></View><Text style={styles.shakeTitle}>Shake to unlock</Text><Text style={styles.copy}>Move your phone with full, deliberate shakes. One impulse counts every 200ms.</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper, padding: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.sm, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { ...type.caption, letterSpacing: 1.4, marginBottom: spacing.sm },
  question: { fontSize: 46, fontWeight: '800', color: colors.ink, marginBottom: spacing.lg },
  answer: { width: '100%', height: 58, borderWidth: 2, borderColor: colors.line, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.soft },
  answerError: { borderColor: colors.danger },
  answerText: { fontSize: 27, fontWeight: '800', color: colors.ink },
  grid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
  key: { width: '31%', height: 56, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  keyPressed: { backgroundColor: colors.ink },
  keyText: { fontSize: 20, fontWeight: '800', color: colors.ink },
  submit: { width: '100%', height: 56, borderRadius: radius.sm, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
  disabled: { backgroundColor: '#E3E3E3' },
  submitText: { color: colors.paper, fontWeight: '800' },
  shakeCircle: { width: 230, height: 230, borderRadius: 115, borderWidth: 14, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  percent: { fontSize: 42, fontWeight: '800', color: colors.ink },
  shakeLabel: { ...type.subhead },
  shakeTitle: { ...type.title, marginTop: spacing.xl },
  copy: { ...type.body, color: colors.muted, textAlign: 'center', maxWidth: 300, lineHeight: 24, marginTop: spacing.sm },
});
