import AsyncStorage from '@react-native-async-storage/async-storage';

export type ChallengeType = 'math' | 'shake';
export type Alarm = { id: string; time: string; label: string; enabled: boolean; challengeType: ChallengeType; days: string[]; mathDifficulty: 'easy' | 'medium' | 'hard'; mathProblemCount: number; shakeCountTarget: number; volume: number; sound: 'default' | 'soft' | 'bright'; vibration: boolean };
export const DEFAULT_ALARMS: Alarm[] = [{ id: 'alarm-1', time: '06:30', label: 'Morning Alarm', enabled: true, challengeType: 'math', days: ['MON','TUE','WED','THU','FRI'], mathDifficulty: 'easy', mathProblemCount: 2, shakeCountTarget: 30, volume: 80, sound: 'default', vibration: true }];
const ALARMS_KEY = 'anti_snooze_alarms_v1';
const COMPLETION_DATES_KEY = 'anti_snooze_completion_dates_v1';
const PREFERENCES_KEY = 'anti_snooze_preferences_v1';
const PERMISSIONS_SEEN_KEY = 'anti_snooze_permissions_seen_v1';
export async function hasSeenPermissions() { return (await AsyncStorage.getItem(PERMISSIONS_SEEN_KEY)) === 'true'; }
export async function markPermissionsSeen() { await AsyncStorage.setItem(PERMISSIONS_SEEN_KEY, 'true'); }
export type AppPreferences = { language: 'en' | 'id'; haptics: boolean; soundEffects: boolean; keepAwake: boolean };
export const DEFAULT_PREFERENCES: AppPreferences = { language: 'en', haptics: true, soundEffects: true, keepAwake: false };
export async function loadPreferences() { const raw = await AsyncStorage.getItem(PREFERENCES_KEY); return raw ? { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) } as AppPreferences : DEFAULT_PREFERENCES; }
export async function savePreferences(preferences: AppPreferences) { await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences)); }

export async function recordChallengeCompletion() {
  const raw = await AsyncStorage.getItem(COMPLETION_DATES_KEY);
  const dates = raw ? JSON.parse(raw) as string[] : [];
  const today = new Date().toISOString().slice(0, 10);
  if (!dates.includes(today)) {
    dates.push(today);
    await AsyncStorage.setItem(COMPLETION_DATES_KEY, JSON.stringify(dates.slice(-365)));
  }
}

export async function loadWakeStreak() {
  const raw = await AsyncStorage.getItem(COMPLETION_DATES_KEY);
  const dates = new Set(raw ? JSON.parse(raw) as string[] : []);
  let streak = 0;
  const cursor = new Date();
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
export async function loadAlarms() { const raw = await AsyncStorage.getItem(ALARMS_KEY); return raw ? JSON.parse(raw) as Alarm[] : DEFAULT_ALARMS; }
export async function saveAlarms(alarms: Alarm[]) { await AsyncStorage.setItem(ALARMS_KEY, JSON.stringify(alarms)); }
export function createMathProblem(difficulty: Alarm['mathDifficulty']) { const a = difficulty === 'easy' ? 12 + Math.floor(Math.random() * 19) : 20 + Math.floor(Math.random() * 61); const b = difficulty === 'easy' ? 10 + Math.floor(Math.random() * 21) : 15 + Math.floor(Math.random() * 50); return difficulty === 'hard' ? { question: `${a % 7 + 3} × ${b % 7 + 3} + 12`, answer: (a % 7 + 3) * (b % 7 + 3) + 12 } : { question: `${a} + ${b}`, answer: a + b }; }
