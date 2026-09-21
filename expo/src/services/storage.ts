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
export type RingtoneChoice = 'radar' | 'siren' | 'clock' | 'custom';
export type CustomRingtone = { name: string; uri: string };
export type AppPreferences = { language: 'en' | 'id'; haptics: boolean; soundEffects: boolean; keepAwake: boolean; ringtone: RingtoneChoice; customRingtoneName?: string; customRingtoneUri?: string; customRingtones?: CustomRingtone[] };
export const DEFAULT_PREFERENCES: AppPreferences = { language: 'en', haptics: true, soundEffects: true, keepAwake: false, ringtone: 'radar', customRingtones: [] };
export async function loadPreferences() {
  const raw = await AsyncStorage.getItem(PREFERENCES_KEY);
  const preferences = raw ? { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) } as AppPreferences : DEFAULT_PREFERENCES;
  // Older versions stored a single custom ringtone; promote it into the library.
  if (preferences.customRingtoneUri && !(preferences.customRingtones ?? []).some((ringtone) => ringtone.uri === preferences.customRingtoneUri)) {
    preferences.customRingtones = [...(preferences.customRingtones ?? []), { name: preferences.customRingtoneName ?? 'Custom', uri: preferences.customRingtoneUri }];
  }
  return preferences;
}
export async function savePreferences(preferences: AppPreferences) { await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences)); }

export type CompletionRecord = { date: string; challengeType: ChallengeType; durationSeconds: number };
export async function recordChallengeCompletion(challengeType: ChallengeType = 'math', durationSeconds = 0) {
  const raw = await AsyncStorage.getItem(COMPLETION_DATES_KEY);
  const records = raw ? JSON.parse(raw) as (string | CompletionRecord)[] : [];
  const today = new Date().toISOString().slice(0, 10);
  const normalized = records.map((record) => typeof record === 'string' ? { date: record, challengeType: 'math' as const, durationSeconds: 0 } : record);
  if (!normalized.some((record) => record.date === today)) normalized.push({ date: today, challengeType, durationSeconds });
  await AsyncStorage.setItem(COMPLETION_DATES_KEY, JSON.stringify(normalized.slice(-365)));
}
export async function loadCompletionStats() {
  const raw = await AsyncStorage.getItem(COMPLETION_DATES_KEY);
  const records = (raw ? JSON.parse(raw) as (string | CompletionRecord)[] : []).map((record) => typeof record === 'string' ? { date: record, challengeType: 'math' as const, durationSeconds: 0 } : record);
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(today); date.setHours(0, 0, 0, 0); date.setDate(today.getDate() - (6 - index)); return date.toISOString().slice(0, 10); });
  const typed = records.filter((record): record is CompletionRecord => typeof record !== 'string');
  const average = (list: CompletionRecord[]) => list.length ? Math.round(list.reduce((sum, record) => sum + record.durationSeconds, 0) / list.length) : 0;
  return { dates: days.map((date) => records.some((record) => record.date === date)), math: typed.filter((record) => record.challengeType === 'math').length, shake: typed.filter((record) => record.challengeType === 'shake').length, averageSeconds: average(typed), mathAvgSeconds: average(typed.filter((record) => record.challengeType === 'math')), shakeAvgSeconds: average(typed.filter((record) => record.challengeType === 'shake')) };
}

export async function loadWakeStreak() {
  const raw = await AsyncStorage.getItem(COMPLETION_DATES_KEY);
  const records = raw ? JSON.parse(raw) as (string | CompletionRecord)[] : [];
  const dates = new Set(records.map((record) => typeof record === 'string' ? record : record.date));
  let streak = 0;
  const cursor = new Date();
  const localDate = () => `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
  while (dates.has(localDate())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
const WEEKDAY_KEYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const INDONESIAN_DAY_KEYS = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'];

// Older app versions stored days as single letters ['S','M','T','W','T','F','S']
// or Indonesian labels. Unmatched entries made dayToWeekday return -1 for every
// day, so scheduling was silently skipped — alarms never registered. Normalize
// once at load so scheduling, display, and the fallback watcher all agree.
function normalizeDays(days: unknown): string[] {
  if (!Array.isArray(days)) return [];
  // Single letters are ambiguous (S = SUN/SAT, T = TUE/THU) except these.
  const UNIQUE_LETTERS: Record<string, string> = { M: 'MON', W: 'WED', F: 'FRI' };
  const mapped = days.map((day) => {
    const value = String(day).trim().toUpperCase();
    const en = WEEKDAY_KEYS.indexOf(value.slice(0, 3));
    if (en >= 0) return WEEKDAY_KEYS[en];
    const id = INDONESIAN_DAY_KEYS.indexOf(value.slice(0, 3));
    if (id >= 0) return WEEKDAY_KEYS[id];
    return UNIQUE_LETTERS[value] ?? value;
  });
  // A full 7-entry legacy letter array maps positionally to the week, which
  // also resolves the ambiguous S/T entries.
  if (mapped.length === 7 && mapped.every((day) => !WEEKDAY_KEYS.includes(day))) {
    return WEEKDAY_KEYS.filter((_, index) => Boolean(mapped[index]));
  }
  return WEEKDAY_KEYS.filter((day) => mapped.includes(day));
}

export async function loadAlarms() {
  const raw = await AsyncStorage.getItem(ALARMS_KEY);
  const alarms = raw ? JSON.parse(raw) as Alarm[] : DEFAULT_ALARMS;
  return alarms.map((alarm) => ({ ...alarm, days: normalizeDays(alarm.days) }));
}
export async function saveAlarms(alarms: Alarm[]) { await AsyncStorage.setItem(ALARMS_KEY, JSON.stringify(alarms)); }
export function createMathProblem(difficulty: Alarm['mathDifficulty']) { const a = difficulty === 'easy' ? 12 + Math.floor(Math.random() * 19) : 20 + Math.floor(Math.random() * 61); const b = difficulty === 'easy' ? 10 + Math.floor(Math.random() * 21) : 15 + Math.floor(Math.random() * 50); return difficulty === 'hard' ? { question: `${a % 7 + 3} × ${b % 7 + 3} + 12`, answer: (a % 7 + 3) * (b % 7 + 3) + 12 } : { question: `${a} + ${b}`, answer: a + b }; }
