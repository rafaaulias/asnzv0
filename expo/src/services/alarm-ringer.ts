import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { loadAlarms } from '@/services/storage';

const RINGTONES = {
  default: require('../../assets/sounds/radar.mp3'),
  soft: require('../../assets/sounds/bell.mp3'),
  bright: require('../../assets/sounds/beep.mp3'),
} as const;

let player: AudioPlayer | null = null;

export async function startRinging(alarmId?: string) {
  await stopRinging();
  const alarms = await loadAlarms();
  const alarm = alarms.find((item) => item.id === alarmId) ?? alarms[0];
  if (!alarm) return;
  player = createAudioPlayer(RINGTONES[alarm.sound ?? 'default']);
  player.loop = true;
  player.volume = Math.min(1, Math.max(0.05, (alarm.volume ?? 80) / 100));
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
