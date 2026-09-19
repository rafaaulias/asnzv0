import { createAudioPlayer } from 'expo-audio';
import { loadPreferences } from '@/services/storage';

const SOURCES = {
  keyboard: require('../../assets/sounds/keyboard.mp3'),
  click: require('../../assets/sounds/click.mp3'),
  switch: require('../../assets/sounds/toggle.mp3'),
};

export async function playSoundEffect(name: keyof typeof SOURCES) {
  const preferences = await loadPreferences();
  if (!preferences.soundEffects) return;
  const player = createAudioPlayer(SOURCES[name]);
  player.volume = 0.45;
  player.play();
}
