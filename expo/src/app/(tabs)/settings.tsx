import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { AppScreen } from '@/components/app-screen';
import { colors, radius, spacing, type } from '@/theme';
import { getAlarmPermissionStatus, requestAlarmPermissions } from '@/services/nativeAlarm';
import { AppPreferences, DEFAULT_PREFERENCES, loadPreferences, savePreferences } from '@/services/storage';
import { playSoundEffect } from '@/services/sound-effects';

function Row({ label, value, onPress, toggle, enabled, onToggle }: { label: string; value?: string; onPress?: () => void; toggle?: boolean; enabled?: boolean; onToggle?: (value: boolean) => void }) {
  const content = <><View><Text style={type.body}>{label}</Text>{value ? <Text style={styles.detail}>{value}</Text> : null}</View>{toggle ? <Switch value={enabled} onValueChange={onToggle} trackColor={{ false: colors.disabled, true: colors.ink }} thumbColor={colors.paper} /> : <Text style={type.subhead}>›</Text>}</>;
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>{content}</Pressable> : <View style={styles.row}>{content}</View>;
}

export default function Settings() {
  const [preferences, setPreferences] = useState<AppPreferences>(DEFAULT_PREFERENCES);
  const [notificationStatus, setNotificationStatus] = useState('Checking…');
  useEffect(() => { loadPreferences().then(setPreferences); getAlarmPermissionStatus().then((status) => setNotificationStatus(status.granted ? 'Allowed' : 'Not allowed')); }, []);
  const update = (next: AppPreferences) => { setPreferences(next); savePreferences(next); };
  return <AppScreen><Text style={type.largeTitle}>Settings</Text><Text style={styles.sub}>Make waking up work for you.</Text>
    <Text style={styles.sectionTitle}>Permissions</Text><View style={styles.card}>
      <Row label="Notifications" value={notificationStatus} onPress={async () => { const granted = await requestAlarmPermissions(); setNotificationStatus(granted ? 'Allowed' : 'Not allowed'); }} />
      <Row label="Background usage" value="Android system settings" onPress={() => Linking.openSettings()} />
    </View>
    <Text style={styles.sectionTitle}>App Preferences</Text><View style={styles.card}>
      <Row label={preferences.language === 'en' ? 'Language' : 'Bahasa'} value={preferences.language === 'en' ? 'English' : 'Indonesia'} onPress={() => { void playSoundEffect('click'); update({ ...preferences, language: preferences.language === 'en' ? 'id' : 'en' }); }} />
      <Row label="Keep screen awake" toggle enabled={preferences.keepAwake} onToggle={(keepAwake) => update({ ...preferences, keepAwake })} />
      <Row label={preferences.language === 'en' ? 'Sound effects' : 'Efek suara'} toggle enabled={preferences.soundEffects} onToggle={(soundEffects) => { void playSoundEffect('switch'); update({ ...preferences, soundEffects }); }} />
      <Row label={preferences.language === 'en' ? 'Haptics' : 'Haptik'} toggle enabled={preferences.haptics} onToggle={(haptics) => { void playSoundEffect('switch'); update({ ...preferences, haptics }); }} />
    </View>
    <Text style={styles.sectionTitle}>About Anti-Snooze</Text><View style={styles.card}><Row label="Storage" value="On device" /><Row label="Privacy" value="No account required" /></View><Text style={styles.foot}>Alarm scheduling and challenge data stay on your device.</Text></AppScreen>;
}

const styles = StyleSheet.create({ sub: { ...type.subhead, marginTop: -spacing.sm }, sectionTitle: { ...type.headline, marginTop: spacing.sm }, card: { borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md }, row: { minHeight: 62, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, detail: { ...type.caption, marginTop: 2, color: colors.faintText }, foot: { ...type.caption, lineHeight: 18 }, pressed: { opacity: 0.65 } });
