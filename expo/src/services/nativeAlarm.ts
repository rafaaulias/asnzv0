import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import IntentLauncher from 'expo-intent-launcher';
import { requireNativeModule } from 'expo';
import notifee, { EventType, type TimestampTrigger, TriggerType } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const isExpoGo = Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';
const PENDING_ALARM_KEY = 'anti_snooze_pending_alarm_v1';
const CHANNEL_ID = 'alarms';

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

type AlarmNativeModule = {
  schedule(id: string, timestampMillis: number): boolean;
  testIn30Seconds(): boolean;
  cancel(id: string): void;
  pendingCount(): number;
  stop(): void;
  takeLastAlarm(): string;
};

let AlarmNative: AlarmNativeModule | null = null;
try {
  if (Platform.OS === 'android' && !isExpoGo) AlarmNative = requireNativeModule<AlarmNativeModule>('AlarmNative');
} catch {
  AlarmNative = null;
}

// Mirrors what is registered with AlarmManager so diagnostics can show a
// count without a native query API.
const scheduledIds = new Set<string>();

export type AlarmDiagnostics = {
  notifications: boolean;
  exactAlarm: boolean;
  batteryOptimized: boolean;
  scheduledCount: number;
  lastError: string | null;
};

export async function getAlarmDiagnostics(): Promise<AlarmDiagnostics> {
  if (isExpoGo || Platform.OS !== 'android') return { notifications: false, exactAlarm: false, batteryOptimized: false, scheduledCount: 0, lastError: 'Expo Go unsupported' };
  // The native count reads AlarmManager directly, so it stays truthful across
  // app restarts — the in-memory set only covers this session.
  let nativeCount: number | null = null;
  try {
    const count = AlarmNative?.pendingCount();
    if (typeof count === 'number' && count >= 0) nativeCount = count;
  } catch {
    // Module unavailable; fall back to the session set below.
  }
  const scheduledCount = nativeCount ?? scheduledIds.size;
  try {
    const settings = await notifee.getNotificationSettings();
    const notifications = settings.authorizationStatus === 1 || settings.authorizationStatus === 2;
    const exactAlarm = settings.android?.alarm === 1;
    const batteryOptimized = !(await notifee.isBatteryOptimizationEnabled().catch(() => true));
    return { notifications, exactAlarm, batteryOptimized, scheduledCount, lastError: scheduledCount === 0 ? lastScheduleError : null };
  } catch (error) {
    return { notifications: false, exactAlarm: false, batteryOptimized: false, scheduledCount, lastError: toMessage(error) };
  }
}

// Fires the full native path (receiver → service → wake screen) in 30 seconds,
// independent of stored alarm data — isolates scheduling from firing.
export function testNativeAlarm() {
  try {
    return AlarmNative?.testIn30Seconds() ?? false;
  } catch (error) {
    lastScheduleError = toMessage(error);
    return false;
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
  // AlarmManager tolerates near-future times, but a two-minute lead keeps the
  // first occurrence predictable when saving during the current minute.
  if (target.getTime() - now.getTime() < 120_000) target.setDate(target.getDate() + 7);
  return Math.floor(target.getTime() / 1000) * 1000;
}

// Schedules one exact AlarmManager alarm per weekday occurrence. The native
// receiver starts a foreground service that plays the ringtone, vibrates, and
// launches the app — independent of the JS layer and notification channels.
export async function scheduleNativeAlarm(alarmId: string, hour: number, minute: number, weekdays: number[]) {
  if (!AlarmNative || weekdays.length === 0) return 0;
  await cancelNativeAlarm(alarmId);
  let scheduled = 0;
  for (const weekday of weekdays) {
    const id = `${alarmId}-${weekday}`;
    try {
      AlarmNative.schedule(id, nextOccurrence(hour, minute, weekday));
      scheduledIds.add(id);
      scheduled += 1;
      lastScheduleError = null;
    } catch (error) {
      scheduledIds.delete(id);
      lastScheduleError = toMessage(error);
      console.log('[v0] Failed to schedule native alarm', id, error);
    }
  }
  console.log('[v0] Scheduled', scheduled, 'native alarm(s) for', alarmId);
  return scheduled;
}

export async function cancelNativeAlarm(id: string) {
  if (AlarmNative) {
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const triggerId = `${id}-${weekday}`;
      try {
        AlarmNative.cancel(triggerId);
      } catch {
        // Nothing scheduled under this id; safe to ignore.
      }
      scheduledIds.delete(triggerId);
    }
  }
  // Cleanup for triggers created by previous app versions via notifee.
  const triggers = await notifee.getTriggerNotificationIds().catch(() => [] as string[]);
  await Promise.all(triggers.filter((triggerId) => String(triggerId).startsWith(`${id}-`)).map((triggerId) => notifee.cancelTriggerNotification(triggerId).catch(() => undefined)));
}

// Reconciles the native alarm list with the stored alarm list: schedules
// every enabled alarm, cancels alarms of disabled/deleted ones. Safe to call
// on every app focus.
export async function syncAlarms(alarms: { id: string; time: string; enabled: boolean; days: string[]; sound: 'default' | 'soft' | 'bright'; vibration: boolean }[]) {
  if (!AlarmNative) return 0;
  // Remove any notifee triggers left over from previous versions so alarms
  // never fire twice.
  const legacy = await notifee.getTriggerNotificationIds().catch(() => [] as string[]);
  await Promise.all(legacy.map((triggerId) => notifee.cancelTriggerNotification(triggerId).catch(() => undefined)));
  const results = await Promise.all(alarms.filter((alarm) => alarm.enabled).map(async (alarm) => {
    const [hour, minute] = alarm.time.split(':').map(Number);
    return scheduleNativeAlarm(alarm.id, hour, minute, alarm.days.map(dayToWeekday).filter((day) => day >= 0));
  }));
  return results.reduce((sum, count) => sum + count, 0);
}

// Stops the native ringing service (sound, vibration, wake lock).
export function stopNativeAlarm() {
  try {
    AlarmNative?.stop();
  } catch {
    // Service already stopped or module unavailable.
  }
}

// Returns the alarm id fired by the native receiver since the last call, or
// undefined. Covers cold and warm launches where no PRESS event is delivered.
export function consumeLastNativeAlarm() {
  try {
    const id = AlarmNative?.takeLastAlarm();
    return id ? id.split('-')[0] : undefined;
  } catch {
    return undefined;
  }
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
  removers.push(notifee.onForegroundEvent((event) => {
    if (event.type !== EventType.PRESS) return;
    const alarmId = event.detail?.notification?.data?.alarmId;
    onAlarm(typeof alarmId === 'string' ? alarmId : undefined);
  }));
  notifee.onBackgroundEvent(async (event) => {
    if (event.type !== EventType.PRESS) return;
    const alarmId = event.detail?.notification?.data?.alarmId;
    await AsyncStorage.setItem(PENDING_ALARM_KEY, typeof alarmId === 'string' ? alarmId : 'true');
  });
  void (async () => {
    const initial = await notifee.getInitialNotification();
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

// Kept for reference: notifee timestamp trigger shape used before the native
// service replaced notification-based alarms.
export type LegacyTimestampTrigger = TimestampTrigger;
