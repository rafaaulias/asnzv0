import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { AppScreen } from '@/components/app-screen';
import { colors, radius, spacing, type } from '@/theme';
import { getAlarmPermissionStatus, requestAlarmPermissions } from '@/services/nativeAlarm';
import { AppPreferences, DEFAULT_PREFERENCES, loadPreferences, savePreferences } from '@/services/storage';
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

export default function Settings() {
  const { t, language } = useTranslation();
  const [preferences, setPreferences] = useState<AppPreferences>(DEFAULT_PREFERENCES);
  const [notificationStatus, setNotificationStatus] = useState('Checking…');
  const [switchingLanguage, setSwitchingLanguage] = useState(false);
  useEffect(() => { loadPreferences().then(setPreferences); getAlarmPermissionStatus().then((status) => setNotificationStatus(status.granted ? t('allowed') : t('notAllowed'))); }, [language]);
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
    const extension = asset.name.includes('.') ? asset.name.split('.').pop() : 'mp3';
    const target = `${directory}custom-ringtone.${extension}`;
    await FileSystem.copyAsync({ from: asset.uri, to: target });
    update({ ...preferences, ringtone: 'custom', customRingtoneName: asset.name, customRingtoneUri: target });
  };

  const testRingtone = (key: 'radar' | 'siren' | 'clock' | 'custom') => {
    void previewRingtone(key, preferences.customRingtoneUri);
  };

  return <AppScreen>
    <Text style={type.largeTitle}>{t('settings')}</Text>
    <Text style={styles.sub}>{t('settingsSubtitle')}</Text>

    <Text style={styles.sectionTitle}>{t('permissions')}</Text>
    <View style={styles.card}>
      <Row label={t('notifications')} value={notificationStatus} onPress={async () => { const granted = await requestAlarmPermissions(); setNotificationStatus(granted ? t('allowed') : t('notAllowed')); }} />
      <Row label={t('backgroundUsage')} value={t('androidSystemSettings')} onPress={() => Linking.openSettings()} />
    </View>

    <Text style={styles.sectionTitle}>{t('ringtoneSelection')}</Text>
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.ringtoneIcon}><Ionicons name="musical-notes-outline" size={18} color={colors.ink} /></View>
        <View style={{ flex: 1 }}>
          <Text style={type.body}>{t('customRingtone')}</Text>
          <Text style={styles.detail} numberOfLines={1}>{preferences.ringtone === 'custom' && preferences.customRingtoneName ? preferences.customRingtoneName : t('customRingtoneHint')}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={t('upload')} onPress={uploadRingtone} style={({ pressed }) => [styles.uploadButton, pressed && styles.pressed]}>
          <Ionicons name="cloud-upload-outline" size={14} color={colors.paper} />
          <Text style={styles.uploadText}>{t('upload')}</Text>
        </Pressable>
      </View>
      {BUILT_IN_RINGTONES.map((ringtone) => {
        const selected = preferences.ringtone === ringtone.key;
        return (
          <Pressable key={ringtone.key} onPress={() => update({ ...preferences, ringtone: ringtone.key })} style={({ pressed }) => [styles.row, styles.ringtoneRow, selected && styles.ringtoneSelected, pressed && styles.pressed]}>
            <View style={{ flex: 1 }}>
              <Text style={[type.body, selected && styles.ringtoneTitleActive]}>{t(ringtone.titleKey)}</Text>
              <Text style={[styles.detail, selected && styles.ringtoneDescActive]}>{t(ringtone.descKey)}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`${t('test')} ${t(ringtone.titleKey)}`} onPress={() => testRingtone(ringtone.key)} style={({ pressed }) => [styles.testButton, pressed && styles.pressed]}>
              <Text style={styles.testText}>{t('test')}</Text>
            </Pressable>
            {selected ? <View style={styles.checkCircle}><Ionicons name="checkmark" size={14} color={colors.paper} /></View> : null}
          </Pressable>
        );
      })}
      {preferences.ringtone === 'custom' ? (
        <View style={[styles.row, styles.ringtoneRow, styles.ringtoneSelected]}>
          <View style={{ flex: 1 }}>
            <Text style={[type.body, styles.ringtoneTitleActive]} numberOfLines={1}>{preferences.customRingtoneName ?? t('customRingtone')}</Text>
            <Text style={[styles.detail, styles.ringtoneDescActive]}>{t('customRingtone')}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={t('test')} onPress={() => testRingtone('custom')} style={({ pressed }) => [styles.testButton, styles.testButtonActive, pressed && styles.pressed]}>
            <Text style={[styles.testText, styles.testTextActive]}>{t('test')}</Text>
          </Pressable>
          <View style={styles.checkCircle}><Ionicons name="checkmark" size={14} color={colors.paper} /></View>
        </View>
      ) : null}
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

const styles = StyleSheet.create({ sub: { ...type.subhead, marginTop: -spacing.sm }, sectionTitle: { ...type.headline, marginTop: spacing.sm }, card: { borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md }, row: { minHeight: 62, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }, detail: { ...type.caption, marginTop: 2, color: colors.faintText }, foot: { ...type.caption, lineHeight: 18 }, pressed: { opacity: 0.65 }, ringtoneIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm }, uploadButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.ink, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 8 }, uploadText: { color: colors.paper, fontSize: 12, fontWeight: '700' }, ringtoneRow: { borderBottomWidth: 0, marginVertical: 4, borderRadius: radius.md }, ringtoneSelected: { backgroundColor: colors.ink }, ringtoneTitleActive: { color: colors.paper }, ringtoneDescActive: { color: '#BDBDBD' }, testButton: { borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.sm, paddingVertical: 6, backgroundColor: colors.paper }, testButtonActive: { borderColor: '#4A4A4A' }, testText: { fontSize: 12, fontWeight: '700', color: colors.ink }, testTextActive: { color: colors.ink }, checkCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.xs }, overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }, overlayCard: { backgroundColor: colors.paper, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', gap: spacing.sm }, overlayText: { ...type.body } });
