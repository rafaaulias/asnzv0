import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }) });
export async function requestAlarmPermissions() { const permissions = await Notifications.requestPermissionsAsync(); return permissions.granted; }
export async function scheduleNativeAlarm(alarmId: string, hour: number, minute: number, weekdays: number[]) { await Notifications.cancelScheduledNotificationAsync(alarmId).catch(() => undefined); return Notifications.scheduleNotificationAsync({ identifier: alarmId, content: { title: 'Anti-Snooze alarm', body: 'Complete your challenge to unlock.', sound: 'default', data: { alarmId, fullScreenIntent: true } }, trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: weekdays[0] ?? 2, hour, minute } }); }
export async function cancelNativeAlarm(id: string) { await Notifications.cancelScheduledNotificationAsync(id); }
// Android full-screen intent + foreground audio service belongs in a config plugin/native module.
// iOS cannot force-launch UI from a locked screen without user interaction/critical-alert entitlement.
