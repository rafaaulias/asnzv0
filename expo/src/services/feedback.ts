import * as HapticsModule from 'expo-haptics';
import { Platform } from 'react-native';

const run = (callback: () => Promise<void>) => Platform.OS === 'web' ? Promise.resolve() : callback();

export const Haptics = {
  selection: () => run(() => HapticsModule.selectionAsync()).catch(() => undefined),
  light: () => run(() => HapticsModule.impactAsync(HapticsModule.ImpactFeedbackStyle.Light)).catch(() => undefined),
  success: () => run(() => HapticsModule.notificationAsync(HapticsModule.NotificationFeedbackType.Success)).catch(() => undefined),
  error: () => run(() => HapticsModule.notificationAsync(HapticsModule.NotificationFeedbackType.Error)).catch(() => undefined),
};
