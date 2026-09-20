import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { AppScreen } from '@/components/app-screen';
import { colors, radius, spacing, type } from '@/theme';
import { getAlarmDiagnostics, openBatterySettings, openExactAlarmSettings, openOverlaySettings, requestAlarmPermissions, syncAlarms, testNativeAlarm, type AlarmDiagnostics } from '@/services/nativeAlarm';
import { AppPreferences, DEFAULT_PREFERENCES, loadAlarms, loadPreferences, savePreferences } from '@/services/storage';
import { playSoundEffect } from '@/services/sound-effects';
import { previewRingtone, stopPreview } from '@/services/alarm-ringer';
import { useTranslation } from '@/i18n';

function Row({ label, value, onPress, toggle, enabled, onToggle }: { label: string; value?: string; onPress?: () => void; toggle?: boolean; enabled?: boolean; onToggle?: (value: boolean) => void }) {
  const content = <><View><Text style={type.body}>{label}</Text>{value ? <Text style={styles.detail}>{value}</Text> : null}</View>{toggle ? <Switch value={enabled} onValueChange={onToggle} trackColor={{ false: colors.disabled, true: colors.ink }} thumbColor={colors.paper} /> : <Text style={type.subhead}>›</Text>}</>;
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>{content}</Pressable> : <View style={styles.row}>{content}</View>;
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

  const uploadRingtone = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/*'], copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    const directory = `${FileSystem.documentDirectory ?? ''}ringtones/`;
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true }).catch(() => undefined);
    if (preferences.customRingtoneUri) await FileSystem.deleteAsync(preferences.customRingtoneUri, { idempotent: true }).catch(() => undefined);
    const extension = asset.name.includes('.') ? asset.name.split('.').pop() : 'mp3';
    const target = `${directory}custom-ringtone.${extension}`;
    await FileSystem.copyAsync({ from: asset.uri, to: target });
    update({ ...preferences, ringtone: 'custom', customRingtoneName: asset.name, customRingtoneUri: target });
  };

  const deleteRingtone = async () => {
    void playSoundEffect('click');
    if (preferences.customRingtoneUri) await FileSystem.deleteAsync(preferences.customRingtoneUri, { idempotent: true }).catch(() => undefined);
    update({ ...preferences, ringtone: 'radar', customRingtoneName: undefined, customRingtoneUri: undefined });
  };

  const selectRingtone = (key: 'radar' | 'siren' | 'clock' | 'custom') => {
    update({ ...preferences, ringtone: key });
    if (key === 'custom' && preferences.customRingtoneUri) void previewRingtone('custom', preferences.customRingtoneUri);
  };

  const testRingtone = (key: 'radar' | 'siren' | 'clock' | 'custom') => {
    void previewRingtone(key, preferences.customRingtoneUri);
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
      <View style={[styles.row, styles.ringtoneRow, preferences.ringtone === 'custom' && styles.ringtoneSelected]}>
        <Pressable accessibilityRole="button" disabled={!preferences.customRingtoneUri} onPress={() => selectRingtone('custom')} style={styles.ringtoneMain}>
          <View style={[styles.ringtoneIcon, preferences.ringtone === 'custom' && styles.ringtoneIconActive]}><Ionicons name="musical-notes-outline" size={18} color={preferences.ringtone === 'custom' ? colors.paper : colors.ink} /></View>
          <View style={styles.ringtoneCopy}>
            <Text style={[type.body, preferences.ringtone === 'custom' && styles.ringtoneTitleActive]} numberOfLines={1}>{preferences.customRingtoneName ?? t('customRingtone')}</Text>
            <Text style={[styles.detail, preferences.ringtone === 'custom' && styles.ringtoneDescActive]} numberOfLines={1}>{preferences.customRingtoneUri ? preferences.customRingtoneName : t('customRingtoneHint')}</Text>
          </View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t('upload')} onPress={uploadRingtone} style={({ pressed }) => [styles.uploadButton, pressed && styles.pressed]}>
          <Ionicons name="cloud-upload-outline" size={14} color={colors.paper} />
          <Text style={styles.uploadText}>{t('upload')}</Text>
        </Pressable>
        {preferences.customRingtoneUri ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t('deleteRingtone')} onPress={deleteRingtone} style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
            <Ionicons name="trash-outline" size={16} color={preferences.ringtone === 'custom' ? colors.paper : colors.ink} />
          </Pressable>
        ) : null}
        {preferences.ringtone === 'custom' ? <View style={styles.checkCircle}><Ionicons name="checkmark" size={14} color={colors.paper} /></View> : null}
      </View>
      {BUILT_IN_RINGTONES.map((ringtone) => {
        const selected = preferences.ringtone === ringtone.key;
        return (
          <View key={ringtone.key} style={[styles.row, styles.ringtoneRow, selected && styles.ringtoneSelected]}>
            <Pressable accessibilityRole="button" onPress={() => selectRingtone(ringtone.key)} style={styles.ringtoneMain}>
              <View style={styles.ringtoneCopy}>
                <Text style={[type.body, selected && styles.ringtoneTitleActive]} numberOfLines={1}>{t(ringtone.titleKey)}</Text>
                <Text style={[styles.detail, selected && styles.ringtoneDescActive]} numberOfLines={1}>{t(ringtone.descKey)}</Text>
              </View>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`${t('test')} ${t(ringtone.titleKey)}`} onPress={() => testRingtone(ringtone.key)} style={({ pressed }) => [styles.testButton, selected && styles.testButtonActive, pressed && styles.pressed]}>
              <Text style={styles.testText}>{t('test')}</Text>
            </Pressable>
            {selected ? <View style={styles.checkCircle}><Ionicons name="checkmark" size={14} color={colors.paper} /></View> : null}
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

const styles = StyleSheet.create({ sub: { ...type.subhead, marginTop: -spacing.sm }, sectionTitle: { ...type.headline, marginTop: spacing.sm }, card: { borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md }, row: { minHeight: 62, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }, detail: { ...type.caption, marginTop: 2, color: colors.faintText }, foot: { ...type.caption, lineHeight: 18 }, pressed: { opacity: 0.65 }, ringtoneIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm }, uploadButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.ink, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 8 }, uploadText: { color: colors.paper, fontSize: 12, fontWeight: '700' }, ringtoneRow: { borderBottomWidth: 0, marginVertical: 4, borderRadius: radius.md, overflow: 'hidden' }, ringtoneMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, ringtoneCopy: { flex: 1 }, ringtoneIconActive: { backgroundColor: 'transparent' }, ringtoneSelected: { backgroundColor: colors.ink }, ringtoneTitleActive: { color: colors.paper }, ringtoneDescActive: { color: '#BDBDBD' }, testButton: { borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.sm, paddingVertical: 6, backgroundColor: colors.paper }, testButtonActive: { borderColor: '#4A4A4A' }, testText: { fontSize: 12, fontWeight: '700', color: colors.ink }, testTextActive: { color: colors.ink }, deleteButton: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.xs }, checkCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: '#4A4A4A', alignItems: 'center', justifyContent: 'center', marginLeft: spacing.xs }, overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }, overlayCard: { backgroundColor: colors.paper, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', gap: spacing.sm }, overlayText: { ...type.body } });
