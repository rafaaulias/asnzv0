import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }) });

export async function getAlarmPermissionStatus() { return Notifications.getPermissionsAsync(); }
export async function requestAlarmPermissions() { const permissions = await Notifications.requestPermissionsAsync(); return permissions.granted; }
export async function scheduleNativeAlarm(alarmId: string, hour: number, minute: number, weekdays: number[], sound: 'default' | 'soft' | 'bright' = 'default', vibration = true) {
  await Notifications.cancelScheduledNotificationAsync(alarmId).catch(() => undefined);
  return Notifications.scheduleNotificationAsync({ identifier: alarmId, content: { title: 'Anti-Snooze alarm', body: 'Complete your challenge to unlock.', sound: 'default', vibrate: vibration ? [0, 250, 150, 250] : undefined, data: { alarmId, fullScreenIntent: true, sound } }, trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: weekdays[0] ?? 2, hour, minute } });
}
export async function cancelNativeAlarm(id: string) { await Notifications.cancelScheduledNotificationAsync(id); }
