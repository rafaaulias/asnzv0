import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { AppScreen } from '@/components/app-screen';
import { colors, radius, spacing, type } from '@/theme';
import { getAlarmDiagnostics, openBatterySettings, openExactAlarmSettings, openOverlaySettings, requestAlarmPermissions, syncAlarms, testNativeAlarm, type AlarmDiagnostics } from '@/services/nativeAlarm';
import { AppPreferences, CustomRingtone, DEFAULT_PREFERENCES, loadAlarms, loadPreferences, savePreferences } from '@/services/storage';
import { playSoundEffect } from '@/services/sound-effects';
import { previewRingtone, stopPreview } from '@/services/alarm-ringer';
import { useTranslation } from '@/i18n';

function Row({ label, value, onPress, toggle, enabled, onToggle }: { label: string; value?: string; onPress?: () => void; toggle?: boolean; enabled?: boolean; onToggle?: (value: boolean) => void }) {
  const content = <><View><Text style={type.body}>{label}</Text>{value ? <Text style={styles.detail}>{value}</Text> : null}</View>{toggle ? <Switch value={enabled} onValueChange={onToggle} trackColor={{ false: colors.disabled, true: colors.ink }} thumbColor={colors.paper} /> : <Text style={type.subhead}>›</Text>}</>;
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>{content}</Pressable> : <View style={styles.row}>{content}</View>;
}

// Radio indicator inspired by the Android alarm sound picker, in the app's
// light palette: hollow circle when idle, filled ink circle with a check when
// selected.
function Radio({ selected }: { selected: boolean }) {
  return selected
    ? <View style={styles.radioSelected}><Ionicons name="checkmark" size={13} color={colors.paper} /></View>
    : <View style={styles.radio} />;
}

const BUILT_IN_RINGTONES = [
  { key: 'radar', titleKey: 'radarChime', descKey: 'radarChimeDesc' },
  { key: 'siren', titleKey: 'emergencySiren', descKey: 'emergencySirenDesc' },
  { key: 'clock', titleKey: 'digitalClock', descKey: 'digitalClockDesc' },
] as const;

function formatNextTrigger(timestamp: number | null | undefined) {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  return `${date.getDate()}/${date.getMonth() + 1} ${time}`;
}

export default function Settings() {
  const { t, language } = useTranslation();
  const [preferences, setPreferences] = useState<AppPreferences>(DEFAULT_PREFERENCES);
  const [notificationStatus, setNotificationStatus] = useState('Checking…');
  const [diagnostics, setDiagnostics] = useState<AlarmDiagnostics | null>(null);
  const [switchingLanguage, setSwitchingLanguage] = useState(false);
  useEffect(() => {
    loadPreferences().then(setPreferences);
    getAlarmDiagnostics().then((value) => {
      setDiagnostics(value);
      setNotificationStatus(value.notifications ? t('allowed') : t('notAllowed'));
    }).catch(() => setNotificationStatus(t('notAllowed')));
  }, [language]);
  const update = (next: AppPreferences) => { setPreferences(next); savePreferences(next); };

  const changeLanguage = () => {
    void playSoundEffect('click');
    setSwitchingLanguage(true);
    setTimeout(() => {
      update({ ...preferences, language: preferences.language === 'en' ? 'id' : 'en' });
      setTimeout(() => setSwitchingLanguage(false), 400);
    }, 500);
  };

  // Each upload is added to the library under a unique filename — nothing is
  // overwritten, so users can keep several ringtones to choose from.
  const uploadRingtone = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/*'], copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    const directory = `${FileSystem.documentDirectory ?? ''}ringtones/`;
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true }).catch(() => undefined);
    const extension = asset.name.includes('.') ? asset.name.split('.').pop() : 'mp3';
    const target = `${directory}ringtone-${Date.now()}.${extension}`;
    await FileSystem.copyAsync({ from: asset.uri, to: target });
    const entry: CustomRingtone = { name: asset.name, uri: target };
    update({ ...preferences, ringtone: 'custom', customRingtoneName: entry.name, customRingtoneUri: entry.uri, customRingtones: [...(preferences.customRingtones ?? []), entry] });
    void previewRingtone('custom', entry.uri);
  };

  const selectCustomRingtone = (entry: CustomRingtone) => {
    void playSoundEffect('click');
    update({ ...preferences, ringtone: 'custom', customRingtoneName: entry.name, customRingtoneUri: entry.uri });
    void previewRingtone('custom', entry.uri);
  };

  const deleteCustomRingtone = async (entry: CustomRingtone) => {
    void playSoundEffect('click');
    const remaining = (preferences.customRingtones ?? []).filter((item) => item.uri !== entry.uri);
    await FileSystem.deleteAsync(entry.uri, { idempotent: true }).catch(() => undefined);
    if (preferences.customRingtoneUri === entry.uri) {
      update({ ...preferences, customRingtones: remaining, ringtone: 'radar', customRingtoneName: undefined, customRingtoneUri: undefined });
    } else {
      update({ ...preferences, customRingtones: remaining });
    }
  };

  const selectRingtone = (key: 'radar' | 'siren' | 'clock') => {
    void playSoundEffect('click');
    update({ ...preferences, ringtone: key });
    void previewRingtone(key);
  };

  const resyncAlarms = async () => {
    void playSoundEffect('click');
    const alarms = await loadAlarms();
    const scheduled = await syncAlarms(alarms);
    console.log('[v0] Manual resync scheduled', scheduled, 'trigger(s)');
    setDiagnostics(await getAlarmDiagnostics());
  };

  const runNativeTest = () => {
    void playSoundEffect('click');
    const ok = testNativeAlarm();
    console.log('[v0] Native test alarm scheduled:', ok);
  };

  return <AppScreen>
    <Text style={type.largeTitle}>{t('settings')}</Text>
    <Text style={styles.sub}>{t('settingsSubtitle')}</Text>

    <Text style={styles.sectionTitle}>{t('permissions')}</Text>
    <View style={styles.card}>
      <Row label={t('notifications')} value={notificationStatus} onPress={async () => { const granted = await requestAlarmPermissions(); const value = await getAlarmDiagnostics(); setDiagnostics(value); setNotificationStatus(value.notifications ? t('allowed') : t('notAllowed')); }} />
      <Row label={t('exactAlarmPermission')} value={diagnostics ? (diagnostics.exactAlarm ? t('allowed') : t('notAllowed')) : '…'} onPress={openExactAlarmSettings} />
      <Row label={t('batteryOptimization')} value={diagnostics ? (diagnostics.batteryOptimized ? t('unrestricted') : t('restricted')) : '…'} onPress={openBatterySettings} />
      <Row label={t('overlayPermission')} value={t('overlayHint')} onPress={openOverlaySettings} />
      <Row label={t('scheduledAlarms')} value={diagnostics ? `${diagnostics.scheduledCount} ${t('triggerCountHint')} — ${t('tapToResync')}` : '…'} onPress={resyncAlarms} />
      <Row label={t('nextAlarm')} value={formatNextTrigger(diagnostics?.nextTriggerAt)} />
      <Row label={t('nativeTestAlarm')} value={t('nativeTestHint')} onPress={runNativeTest} />
      <Row label={t('backgroundUsage')} value={t('androidSystemSettings')} onPress={() => Linking.openSettings()} />
      {diagnostics?.lastError ? <Text style={[styles.detail, { color: '#C62828', paddingHorizontal: spacing.sm, paddingBottom: spacing.sm }]}>{diagnostics.lastError}</Text> : null}
    </View>

    <Text style={styles.sectionTitle}>{t('ringtoneSelection')}</Text>
    <View style={styles.card}>
      <Text style={styles.groupLabel}>{t('yourSounds')}</Text>
      {(preferences.customRingtones ?? []).map((ringtone) => {
        const selected = preferences.ringtone === 'custom' && preferences.customRingtoneUri === ringtone.uri;
        return (
          <View key={ringtone.uri} style={styles.row}>
            <Pressable accessibilityRole="button" onPress={() => selectCustomRingtone(ringtone)} style={styles.ringtoneMain}>
              <Ionicons name="musical-notes-outline" size={18} color={colors.ink} />
              <Text style={[type.body, styles.ringtoneName]} numberOfLines={1}>{ringtone.name}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`${t('test')} ${ringtone.name}`} onPress={() => void previewRingtone('custom', ringtone.uri)} style={({ pressed }) => [styles.testButton, pressed && styles.pressed]}>
              <Text style={styles.testText}>{t('test')}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t('deleteRingtone')} onPress={() => void deleteCustomRingtone(ringtone)} style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
              <Ionicons name="trash-outline" size={16} color={colors.ink} />
            </Pressable>
            <Radio selected={selected} />
          </View>
        );
      })}
      <View style={styles.row}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('addNew')} onPress={uploadRingtone} style={({ pressed }) => [styles.ringtoneMain, pressed && styles.pressed]}>
          <Ionicons name="add-circle-outline" size={20} color={colors.ink} />
          <Text style={type.body}>{t('addNew')}</Text>
        </Pressable>
        <Radio selected={false} />
      </View>

      <Text style={styles.groupLabel}>{t('builtIn')}</Text>
      {BUILT_IN_RINGTONES.map((ringtone) => {
        const selected = preferences.ringtone === ringtone.key;
        return (
          <View key={ringtone.key} style={styles.row}>
            <Pressable accessibilityRole="button" onPress={() => selectRingtone(ringtone.key)} style={styles.ringtoneMain}>
              <View style={styles.ringtoneCopy}>
                <Text style={[type.body, selected && styles.ringtoneNameActive]} numberOfLines={1}>{t(ringtone.titleKey)}</Text>
                <Text style={styles.detail} numberOfLines={1}>{t(ringtone.descKey)}</Text>
              </View>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`${t('test')} ${t(ringtone.titleKey)}`} onPress={() => void previewRingtone(ringtone.key)} style={({ pressed }) => [styles.testButton, pressed && styles.pressed]}>
              <Text style={styles.testText}>{t('test')}</Text>
            </Pressable>
            <Radio selected={selected} />
          </View>
        );
      })}
    </View>

    <Text style={styles.sectionTitle}>{t('appPreferences')}</Text>
    <View style={styles.card}>
      <Row label={t('language')} value={preferences.language === 'en' ? t('english') : t('indonesian')} onPress={changeLanguage} />
      <Row label={t('keepScreenAwake')} toggle enabled={preferences.keepAwake} onToggle={(keepAwake) => update({ ...preferences, keepAwake })} />
      <Row label={t('soundEffects')} toggle enabled={preferences.soundEffects} onToggle={(soundEffects) => { void playSoundEffect('switch'); update({ ...preferences, soundEffects }); }} />
      <Row label={t('haptics')} toggle enabled={preferences.haptics} onToggle={(haptics) => { void playSoundEffect('switch'); update({ ...preferences, haptics }); }} />
    </View>

    <Text style={styles.sectionTitle}>{t('about')}</Text>
    <View style={styles.card}>
      <Row label={t('storage')} value={t('onDevice')} />
      <Row label={t('privacy')} value={t('noAccountRequired')} />
    </View>
    <Text style={styles.foot}>{t('dataFootnote')}</Text>

    <Modal visible={switchingLanguage} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.overlayCard}>
          <ActivityIndicator color={colors.ink} />
          <Text style={styles.overlayText}>{t('applyingLanguage')}</Text>
        </View>
      </View>
    </Modal>
  </AppScreen>;
}

const styles = StyleSheet.create({
  sub: { ...type.subhead, marginTop: -spacing.sm },
  sectionTitle: { ...type.headline, marginTop: spacing.sm },
  card: { borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md },
  row: { minHeight: 62, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  detail: { ...type.caption, marginTop: 2, color: colors.faintText },
  foot: { ...type.caption, lineHeight: 18 },
  pressed: { opacity: 0.65 },
  groupLabel: { ...type.caption, color: colors.faintText, paddingTop: spacing.sm },
  ringtoneMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ringtoneCopy: { flex: 1 },
  ringtoneName: { flex: 1 },
  ringtoneNameActive: { fontFamily: type.subhead.fontFamily, fontWeight: '700' },
  testButton: { borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.sm, paddingVertical: 6, backgroundColor: colors.paper },
  testText: { fontSize: 12, fontWeight: '700', color: colors.ink },
  deleteButton: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border },
  radioSelected: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  overlayCard: { backgroundColor: colors.paper, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', gap: spacing.sm },
  overlayText: { ...type.subhead, color: colors.muted },
});
