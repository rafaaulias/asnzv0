import AsyncStorage from '@react-native-async-storage/async-storage';

export type ChallengeType = 'math' | 'shake';
export type Alarm = { id: string; time: string; label: string; enabled: boolean; challengeType: ChallengeType; days: string[]; mathDifficulty: 'easy' | 'medium' | 'hard'; mathProblemCount: number; shakeCountTarget: number; volume: number };
export const DEFAULT_ALARMS: Alarm[] = [{ id: 'alarm-1', time: '06:30', label: 'Morning Alarm', enabled: true, challengeType: 'math', days: ['M','T','W','T','F'], mathDifficulty: 'easy', mathProblemCount: 2, shakeCountTarget: 30, volume: 80 }];
const ALARMS_KEY = 'anti_snooze_alarms_v1';
export async function loadAlarms() { const raw = await AsyncStorage.getItem(ALARMS_KEY); return raw ? JSON.parse(raw) as Alarm[] : DEFAULT_ALARMS; }
export async function saveAlarms(alarms: Alarm[]) { await AsyncStorage.setItem(ALARMS_KEY, JSON.stringify(alarms)); }
export function createMathProblem(difficulty: Alarm['mathDifficulty']) { const a = difficulty === 'easy' ? 12 + Math.floor(Math.random() * 19) : 20 + Math.floor(Math.random() * 61); const b = difficulty === 'easy' ? 10 + Math.floor(Math.random() * 21) : 15 + Math.floor(Math.random() * 50); return difficulty === 'hard' ? { question: `${a % 7 + 3} × ${b % 7 + 3} + 12`, answer: (a % 7 + 3) * (b % 7 + 3) + 12 } : { question: `${a} + ${b}`, answer: a + b }; }
