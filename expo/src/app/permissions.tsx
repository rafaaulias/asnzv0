import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { requestAlarmPermissions } from '@/services/nativeAlarm';
import { markPermissionsSeen } from '@/services/storage';
import { colors, radius, spacing, type } from '@/theme';
import { useTranslation } from '@/i18n';

export default function PermissionsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const cards = [
    [t('exactAlarms'), t('exactAlarmsDesc')],
    [t('notifications'), t('notificationsDesc')],
    [t('unrestrictedBattery'), t('unrestrictedBatteryDesc')],
  ];
  const finish = async () => { if (step < cards.length - 1) { setStep((current) => current + 1); return; } await requestAlarmPermissions(); await Linking.openSettings(); await markPermissionsSeen(); router.replace('/(tabs)' as never); };
  return <View style={styles.safe}><Text style={styles.title}>{t('permissionTitle')}</Text><Text style={styles.copy}>{t('permissionCopy')}</Text><View style={styles.card}><Text style={styles.cardTitle}>{cards[step][0]}</Text><Text style={styles.cardCopy}>{cards[step][1]}</Text></View><Pressable onPress={finish} style={styles.button}><Text style={styles.buttonText}>{step === cards.length - 1 ? t('grantAccess') : t('continue')}</Text></Pressable><Text style={styles.step}>{t('step')} {step + 1} {t('of')} {cards.length}</Text></View>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.paper, padding: spacing.xl, justifyContent: 'center' }, title: { ...type.largeTitle, marginBottom: spacing.sm }, copy: { ...type.body, color: colors.muted, lineHeight: 24 }, card: { marginTop: spacing.xl, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, minHeight: 170, justifyContent: 'center' }, cardTitle: { ...type.title }, cardCopy: { ...type.body, color: colors.muted, marginTop: spacing.sm }, button: { marginTop: spacing.xl, height: 56, borderRadius: radius.sm, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }, buttonText: { color: colors.paper, fontWeight: '700' }, step: { ...type.caption, textAlign: 'center', marginTop: spacing.md } });
