import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { loadAlarms, loadPreferences } from '@/services/storage';

const RINGTONES = {
  default: require('../../assets/sounds/radar.mp3'),
  soft: require('../../assets/sounds/bell.mp3'),
  bright: require('../../assets/sounds/beep.mp3'),
  siren: require('../../assets/sounds/beep.mp3'),
  clock: require('../../assets/sounds/bell.mp3'),
} as const;

let player: AudioPlayer | null = null;

async function resolveSource(alarmId?: string) {
  const [alarms, preferences] = await Promise.all([loadAlarms(), loadPreferences()]);
  const alarm = alarms.find((item) => item.id === alarmId) ?? alarms[0];
  const volume = alarm?.volume ?? 80;
  if (alarm?.sound === 'default' && preferences.ringtone === 'custom' && preferences.customRingtoneUri) {
    return { source: { uri: preferences.customRingtoneUri }, volume };
  }
  const key = alarm?.sound !== 'default' ? alarm?.sound ?? 'default' : preferences.ringtone === 'siren' ? 'siren' : preferences.ringtone === 'clock' ? 'clock' : 'default';
  return { source: RINGTONES[key], volume };
}

export async function startRinging(alarmId?: string) {
  await stopRinging();
  const { source, volume } = await resolveSource(alarmId);
  player = createAudioPlayer(source);
  player.loop = true;
  player.volume = Math.min(1, Math.max(0.05, volume / 100));
  player.play();
}

export async function stopRinging() {
  if (!player) return;
  const current = player;
  player = null;
  try {
    current.pause();
    current.remove();
  } catch {
    // Player may already be released.
  }
}

let previewPlayer: AudioPlayer | null = null;

export async function previewRingtone(choice: 'radar' | 'siren' | 'clock' | 'custom', customUri?: string) {
  await stopPreview();
  const source = choice === 'custom' && customUri ? { uri: customUri } : RINGTONES[choice === 'radar' || choice === 'custom' ? 'default' : choice];
  previewPlayer = createAudioPlayer(source);
  previewPlayer.play();
}

export async function stopPreview() {
  if (!previewPlayer) return;
  const current = previewPlayer;
  previewPlayer = null;
  try {
    current.pause();
    current.remove();
  } catch {
    // Player may already be released.
  }
}
