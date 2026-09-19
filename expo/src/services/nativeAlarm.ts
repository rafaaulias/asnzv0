import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import IntentLauncher from 'expo-intent-launcher';
import notifee, { AndroidImportance, EventType, RepeatFrequency, TriggerType, type TimestampTrigger } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const isExpoGo = Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';
const PENDING_ALARM_KEY = 'anti_snooze_pending_alarm_v1';
const CHANNEL_ID = 'alarms';

const SOUND_RESOURCES = { default: 'radar', soft: 'bell', bright: 'beep' } as const;

const WEEKDAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

// The last native scheduling error is kept so the Settings diagnostics screen
// can surface why triggers are missing instead of failing silently.
let lastScheduleError: string | null = null;

function toMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return typeof error === 'string' ? error : JSON.stringify(error);
}

// Matches Date.getDay(): SUN = 0 ... SAT = 6.
export function dayToWeekday(day: string) {
  return WEEKDAY_NAMES.indexOf(day.toUpperCase() as (typeof WEEKDAY_NAMES)[number]);
}

// Channel creation must be retried on failure: caching a rejected attempt as
// null permanently disabled all scheduling for the session.
let channelReady: Promise<typeof notifee | null> | null = null;

async function getNotifee() {
  if (isExpoGo || Platform.OS !== 'android') return null;
  if (!channelReady) {
    channelReady = (async () => {
      try {
        await notifee.createChannel({
          id: CHANNEL_ID,
          name: 'Alarms',
          importance: AndroidImportance.HIGH,
          sound: 'radar',
          vibration: true,
          vibrationPattern: [0, 250, 150, 250],
          bypassDnd: false,
          visibility: 1,
        });
      } catch (error) {
        // Some OEM ROMs reject extended channel fields; a minimal channel
        // still fires alarms (with the default sound) instead of none.
        lastScheduleError = `channel: ${toMessage(error)}`;
        console.log('[v0] Full channel creation failed, retrying minimal', error);
        await notifee.createChannel({ id: CHANNEL_ID, name: 'Alarms', importance: AndroidImportance.HIGH });
      }
      return notifee;
    })().catch((error) => {
      lastScheduleError = `channel: ${toMessage(error)}`;
      console.log('[v0] Alarm channel creation failed, will retry', error);
      channelReady = null;
      return null;
    });
  }
  return channelReady;
}

export type AlarmDiagnostics = {
  notifications: boolean;
  exactAlarm: boolean;
  batteryOptimized: boolean;
  scheduledCount: number;
  lastError: string | null;
};

export async function getAlarmDiagnostics(): Promise<AlarmDiagnostics> {
  if (isExpoGo || Platform.OS !== 'android') return { notifications: false, exactAlarm: false, batteryOptimized: false, scheduledCount: 0, lastError: 'Expo Go unsupported' };
  try {
    const settings = await notifee.getNotificationSettings();
    const notifications = settings.authorizationStatus === 1 || settings.authorizationStatus === 2;
    const exactAlarm = settings.android?.alarm === 1;
    const batteryOptimized = !(await notifee.isBatteryOptimizationEnabled().catch(() => true));
    const scheduledCount = (await notifee.getTriggerNotificationIds().catch(() => [])).length;
    return { notifications, exactAlarm, batteryOptimized, scheduledCount, lastError: scheduledCount === 0 ? lastScheduleError : null };
  } catch (error) {
    return { notifications: false, exactAlarm: false, batteryOptimized: false, scheduledCount: 0, lastError: toMessage(error) };
  }
}

// Kept for the onboarding flow only. Scheduling must never be gated on this.
export async function requestAlarmPermissions() {
  try {
    const settings = await notifee.getNotificationSettings();
    const notificationsGranted = settings.authorizationStatus === 1 || settings.authorizationStatus === 2;
    const alarmGranted = settings.android?.alarm === 1;
    // Only surface system screens for what is actually missing — opening the
    // alarms page unconditionally made every save bounce the user to Settings.
    if (!notificationsGranted) await notifee.requestPermission();
    if (!alarmGranted) await notifee.openAlarmPermissionSettings().catch(() => undefined);
    const updated = await notifee.getNotificationSettings();
    return (updated.authorizationStatus === 1 || updated.authorizationStatus === 2) && updated.android?.alarm === 1;
  } catch {
    return false;
  }
}

// Full-screen intents are only delivered when the app may draw over other
// apps; several ROMs (XOS included) ship with that access denied by default.
export async function openOverlaySettings() {
  try {
    await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.MANAGE_OVERLAY_PERMISSION, {
      data: `package:${Constants.expoConfig?.android?.package ?? 'com.antisnooze.alarm'}`,
    });
  } catch {
    await Linking.openSettings().catch(() => undefined);
  }
}

export async function openExactAlarmSettings() {
  try {
    await notifee.openAlarmPermissionSettings();
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
  // Notifee rejects timestamps that are not in the future; saving an alarm for
  // the current minute made creation fail intermittently (random trigger
  // counts). Keep a two-minute lead and roll a week forward when needed.
  if (target.getTime() - now.getTime() < 120_000) target.setDate(target.getDate() + 7);
  return Math.floor(target.getTime() / 1000) * 1000;
}

export async function scheduleNativeAlarm(alarmId: string, hour: number, minute: number, weekdays: number[], sound: 'default' | 'soft' | 'bright' = 'default', vibration = true) {
  const module = await getNotifee();
  if (!module || weekdays.length === 0) return 0;
  await cancelNativeAlarm(alarmId);
  const soundResource = SOUND_RESOURCES[sound] ?? 'radar';
  let scheduled = 0;
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
      scheduled += 1;
      lastScheduleError = null;
    } catch (error) {
      // Retry with the minimal fields some ROMs reject; a plain trigger still
      // wakes the app with the channel sound instead of never firing.
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
          },
        }, trigger);
        scheduled += 1;
        lastScheduleError = null;
      } catch (retryError) {
        lastScheduleError = toMessage(retryError);
        console.log('[v0] Failed to schedule alarm trigger', alarmId, weekday, retryError);
      }
    }
  }));
  console.log('[v0] Scheduled', scheduled, 'trigger(s) for alarm', alarmId);
  return scheduled;
}

export async function cancelNativeAlarm(id: string) {
  const module = await getNotifee();
  if (!module) return;
  const triggers = await module.getTriggerNotificationIds().catch(() => [] as string[]);
  await Promise.all(triggers.filter((triggerId) => String(triggerId).startsWith(`${id}-`)).map((triggerId) => module.cancelTriggerNotification(triggerId)));
}

// Reconciles the native trigger list with the stored alarm list: schedules
// every enabled alarm, cancels triggers of disabled/deleted ones. Safe to call
// on every app focus.
export async function syncAlarms(alarms: { id: string; time: string; enabled: boolean; days: string[]; sound: 'default' | 'soft' | 'bright'; vibration: boolean }[]) {
  const module = await getNotifee();
  if (!module) return 0;
  const existing = await module.getTriggerNotificationIds().catch(() => [] as string[]);
  const keep = new Set(alarms.filter((alarm) => alarm.enabled).flatMap((alarm) => alarm.days.map((day) => `${alarm.id}-${dayToWeekday(day)}`)));
  await Promise.all(existing.filter((triggerId) => !keep.has(String(triggerId))).map((triggerId) => module.cancelTriggerNotification(triggerId).catch(() => undefined)));
  const results = await Promise.all(alarms.filter((alarm) => alarm.enabled).map(async (alarm) => {
    const [hour, minute] = alarm.time.split(':').map(Number);
    return scheduleNativeAlarm(alarm.id, hour, minute, alarm.days.map(dayToWeekday).filter((day) => day >= 0), alarm.sound, alarm.vibration);
  }));
  return results.reduce((sum, count) => sum + count, 0);
}

// Detects an alarm notification that launched the app (full-screen intent on a
// warm launch produces no PRESS event, so the displayed list is the only
// reliable source) and dismisses it once consumed.
export async function checkFiredAlarm() {
  if (isExpoGo || Platform.OS !== 'android') return undefined;
  try {
    const displayed = await notifee.getDisplayedNotifications();
    const alarm = displayed.find((item) => item.notification.android?.channelId === CHANNEL_ID);
    if (!alarm) return undefined;
    const alarmId = alarm.notification.data?.alarmId;
    if (alarm.id) await notifee.cancelNotification(alarm.id).catch(() => undefined);
    return typeof alarmId === 'string' ? alarmId : 'true';
  } catch {
    return undefined;
  }
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
