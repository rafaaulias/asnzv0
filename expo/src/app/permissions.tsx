import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { openBatterySettings, openExactAlarmSettings, requestAlarmPermissions } from '@/services/nativeAlarm';
import { markPermissionsSeen } from '@/services/storage';
import { colors, radius, spacing, type } from '@/theme';
import { useTranslation } from '@/i18n';

export default function PermissionsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const cards = [
    [t('exactAlarms'), t('exactAlarmsDesc')],
    [t('notifications'), t('notificationsDesc')],
    [t('unrestrictedBattery'), t('unrestrictedBatteryDesc')],
  ];
  const isLast = step === cards.length - 1;

  // Navigation must never depend on a permission call succeeding or the user
  // returning from system settings — Android may kill the app while it is
  // backgrounded, so anything awaited across settings would be lost.
  const complete = async () => {
    await markPermissionsSeen().catch(() => undefined);
    router.replace('/(tabs)' as never);
  };

  const finish = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (step === 0) await openExactAlarmSettings();
      else if (step === 1) await requestAlarmPermissions();
      else if (isLast) {
        void openBatterySettings();
        await complete();
        return;
      }
      setStep((current) => current + 1);
    } finally {
      setBusy(false);
    }
  };

  const skip = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await complete();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.safe}>
      <Text style={styles.title}>{t('permissionTitle')}</Text>
      <Text style={styles.copy}>{t('permissionCopy')}</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{cards[step][0]}</Text>
        <Text style={styles.cardCopy}>{cards[step][1]}</Text>
      </View>
      <Pressable disabled={busy} onPress={finish} style={[styles.button, busy && styles.buttonBusy]}>
        {busy ? <ActivityIndicator color={colors.paper} /> : <Text style={styles.buttonText}>{isLast ? t('grantAccess') : t('continue')}</Text>}
      </Pressable>
      <Pressable disabled={busy} onPress={skip} style={styles.skip}>
        <Text style={styles.skipText}>{t('skipForNow')}</Text>
      </Pressable>
      <Text style={styles.step}>{t('step')} {step + 1} {t('of')} {cards.length}</Text>
    </View>
  );
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.paper, padding: spacing.xl, justifyContent: 'center' }, title: { ...type.largeTitle, marginBottom: spacing.sm }, copy: { ...type.body, color: colors.muted, lineHeight: 24 }, card: { marginTop: spacing.xl, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, minHeight: 170, justifyContent: 'center' }, cardTitle: { ...type.title }, cardCopy: { ...type.body, color: colors.muted, marginTop: spacing.sm }, button: { marginTop: spacing.xl, height: 56, borderRadius: radius.sm, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }, buttonBusy: { opacity: 0.7 }, buttonText: { color: colors.paper, fontWeight: '700' }, skip: { alignItems: 'center', marginTop: spacing.md, padding: spacing.sm }, skipText: { ...type.body, color: colors.muted, textDecorationLine: 'underline' }, step: { ...type.caption, textAlign: 'center', marginTop: spacing.md } });
