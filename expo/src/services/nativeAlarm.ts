import Constants from 'expo-constants';
import type * as Notifications from 'expo-notifications';

type NotificationModule = typeof Notifications;

const isExpoGo = Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';
let notificationsPromise: Promise<NotificationModule | null> | null = null;

async function getNotifications() {
  if (isExpoGo) return null;
  notificationsPromise ??= import('expo-notifications')
    .then((module) => {
      if (process.env.EXPO_OS === 'android') void module.setNotificationChannelAsync('alarm', { name: 'Alarms', importance: module.AndroidImportance.MAX, sound: 'radar.mp3', vibrationPattern: [0, 250, 150, 250], lockscreenVisibility: module.AndroidNotificationVisibility.PUBLIC });
      module.setNotificationHandler({ handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }) });
      return module;
    })
    .catch(() => null);
  return notificationsPromise;
}

export async function getAlarmPermissionStatus() {
  const notifications = await getNotifications();
  return notifications ? notifications.getPermissionsAsync() : { granted: false, canAskAgain: false, status: 'undetermined' as const };
}

export async function requestAlarmPermissions() {
  const notifications = await getNotifications();
  if (!notifications) return false;
  const permissions = await notifications.requestPermissionsAsync();
  return permissions.granted;
}

export async function scheduleNativeAlarm(alarmId: string, hour: number, minute: number, weekdays: number[], sound: 'default' | 'soft' | 'bright' = 'default', vibration = true) {
  const notifications = await getNotifications();
  if (!notifications) return null;
  if (weekdays.length === 0) return null;
  await cancelNativeAlarm(alarmId);
  const soundFile = sound === 'default' ? 'radar.mp3' : sound === 'soft' ? 'bell.mp3' : 'beep.mp3';
  await Promise.all(weekdays.map((weekday) => notifications.scheduleNotificationAsync({ identifier: `${alarmId}-${weekday}`, content: { title: 'Anti-Snooze alarm', body: 'Complete your challenge to unlock.', sound: soundFile, vibrate: vibration ? [0, 250, 150, 250] : undefined, data: { alarmId, fullScreenIntent: true, sound } }, trigger: { type: notifications.SchedulableTriggerInputTypes.WEEKLY, weekday, hour, minute } })));
  return alarmId;
}

export async function cancelNativeAlarm(id: string) {
  const notifications = await getNotifications();
  if (!notifications) return;
  const scheduled = await notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled.filter((item) => String(item.identifier).startsWith(`${id}-`)).map((item) => notifications.cancelScheduledNotificationAsync(item.identifier)));
  await notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
}
