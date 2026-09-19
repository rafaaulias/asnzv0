import Constants from 'expo-constants';
import type * as Notifications from 'expo-notifications';

type NotificationModule = typeof Notifications;

const isExpoGo = Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';
let notificationsPromise: Promise<NotificationModule | null> | null = null;

async function getNotifications() {
  if (isExpoGo) return null;
  notificationsPromise ??= import('expo-notifications')
    .then((module) => {
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
  await notifications.cancelScheduledNotificationAsync(alarmId).catch(() => undefined);
  return notifications.scheduleNotificationAsync({ identifier: alarmId, content: { title: 'Anti-Snooze alarm', body: 'Complete your challenge to unlock.', sound: sound === 'default' ? 'radar.mp3' : sound === 'soft' ? 'bell.mp3' : 'beep.mp3', vibrate: vibration ? [0, 250, 150, 250] : undefined, data: { alarmId, fullScreenIntent: true, sound } }, trigger: { type: notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: weekdays[0] ?? 2, hour, minute } });
}

export async function cancelNativeAlarm(id: string) {
  const notifications = await getNotifications();
  if (notifications) await notifications.cancelScheduledNotificationAsync(id);
}
