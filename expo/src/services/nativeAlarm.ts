import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import IntentLauncher from 'expo-intent-launcher';
import notifee, { AndroidImportance, EventType, RepeatFrequency, TriggerType, type TimestampTrigger } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const isExpoGo = Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';
const PENDING_ALARM_KEY = 'anti_snooze_pending_alarm_v1';
const CHANNEL_ID = 'alarms';

const SOUND_RESOURCES = { default: 'radar', soft: 'bell', bright: 'beep' } as const;

let ready: Promise<typeof notifee | null> | null = null;

async function getNotifee() {
  if (isExpoGo || Platform.OS !== 'android') return null;
  ready ??= notifee
    .createChannel({ id: CHANNEL_ID, name: 'Alarms', importance: AndroidImportance.HIGH, sound: 'radar', vibration: true, vibrationPattern: [0, 250, 150, 250], bypassDnd: false, visibility: 1 })
    .then(() => notifee)
    .catch(() => null);
  return ready;
}

const WEEKDAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

// Matches Date.getDay(): SUN = 0 ... SAT = 6.
export function dayToWeekday(day: string) {
  return WEEKDAY_NAMES.indexOf(day.toUpperCase() as (typeof WEEKDAY_NAMES)[number]);
}

export async function getAlarmPermissionStatus() {
  if (isExpoGo || Platform.OS !== 'android') return { granted: false, canAskAgain: false, status: 'undetermined' as const };
  try {
    const settings = await notifee.getNotificationSettings();
    const granted = settings.authorizationStatus === 1 || settings.authorizationStatus === 2;
    return { granted, canAskAgain: true, status: granted ? 'granted' as const : 'undetermined' as const };
  } catch {
    return { granted: false, canAskAgain: false, status: 'undetermined' as const };
  }
}

export async function requestAlarmPermissions() {
  try {
    const module = await getNotifee();
    if (!module) return false;
    const settings = await module.requestPermission();
    const notificationGranted = settings.authorizationStatus === 1 || settings.authorizationStatus === 2;
    return notificationGranted && settings.android?.alarm === 1;
  } catch {
    return false;
  }
}

export async function openExactAlarmSettings() {
  try {
    const module = await getNotifee();
    if (!module) throw new Error('notifee unavailable');
    await module.openAlarmPermissionSettings();
  } catch {
    await Linking.openSettings().catch(() => undefined);
  }
}

export async function openBatterySettings() {
  try {
    await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
  } catch {
    await Linking.openSettings().catch(() => undefined);
  }
}

function nextOccurrence(hour: number, minute: number, weekday: number) {
  const now = new Date();
  const target = new Date(now);
  const currentWeekday = now.getDay();
  let delta = (weekday - currentWeekday + 7) % 7;
  target.setHours(hour, minute, 0, 0);
  if (delta === 0 && target.getTime() <= now.getTime()) delta = 7;
  target.setDate(now.getDate() + delta);
  return Math.floor(target.getTime() / 1000) * 1000;
}

export async function scheduleNativeAlarm(alarmId: string, hour: number, minute: number, weekdays: number[], sound: 'default' | 'soft' | 'bright' = 'default', vibration = true) {
  const module = await getNotifee();
  if (!module || weekdays.length === 0) return null;
  await cancelNativeAlarm(alarmId);
  const soundResource = SOUND_RESOURCES[sound] ?? 'radar';
  await Promise.all(weekdays.map(async (weekday) => {
    const trigger: TimestampTrigger = { type: TriggerType.TIMESTAMP, timestamp: nextOccurrence(hour, minute, weekday), alarmManager: { allowWhileIdle: true }, repeatFrequency: RepeatFrequency.WEEKLY };
    try {
      await module.createTriggerNotification({
        id: `${alarmId}-${weekday}`,
        title: 'Anti-Snooze alarm',
        body: 'Complete your challenge to unlock.',
        data: { alarmId },
        android: {
          channelId: CHANNEL_ID,
          smallIcon: 'ic_launcher',
          pressAction: { id: 'default', launchActivity: 'default' },
          fullScreenAction: { id: 'default', launchActivity: 'default' },
          loopSound: true,
          sound: soundResource,
          ongoing: true,
          vibrationPattern: vibration ? [0, 250, 150, 250] : undefined,
        },
      }, trigger);
    } catch (error) {
      console.log('[v0] Failed to schedule alarm trigger', alarmId, weekday, error);
    }
  }));
  return alarmId;
}

export async function cancelNativeAlarm(id: string) {
  const module = await getNotifee();
  if (!module) return;
  const triggers = await module.getTriggerNotificationIds();
  await Promise.all(triggers.filter((triggerId) => String(triggerId).startsWith(`${id}-`)).map((triggerId) => module.cancelTriggerNotification(triggerId)));
}

export function addAlarmResponseHandler(onAlarm: (alarmId?: string) => void) {
  if (isExpoGo || Platform.OS !== 'android') return { remove: () => undefined };
  const removers: (() => void)[] = [];
  void (async () => {
    const module = await getNotifee();
    if (!module) return;
    removers.push(module.onForegroundEvent((event) => {
      if (event.type !== EventType.PRESS) return;
      const alarmId = event.detail?.notification?.data?.alarmId;
      onAlarm(typeof alarmId === 'string' ? alarmId : undefined);
    }));
    module.onBackgroundEvent(async (event) => {
      if (event.type !== EventType.PRESS) return;
      const alarmId = event.detail?.notification?.data?.alarmId;
      await AsyncStorage.setItem(PENDING_ALARM_KEY, typeof alarmId === 'string' ? alarmId : 'true');
    });
    const initial = await module.getInitialNotification();
    if (initial) {
      const alarmId = initial.notification.data?.alarmId;
      await AsyncStorage.removeItem(PENDING_ALARM_KEY);
      onAlarm(typeof alarmId === 'string' ? alarmId : undefined);
    }
  })();
  return { remove: () => removers.forEach((remove) => remove()) };
}

export async function consumePendingAlarm() {
  const pending = await AsyncStorage.getItem(PENDING_ALARM_KEY);
  if (pending === null) return undefined;
  await AsyncStorage.removeItem(PENDING_ALARM_KEY);
  return pending === 'true' ? undefined : pending;
}
