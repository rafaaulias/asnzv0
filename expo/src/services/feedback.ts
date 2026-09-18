import * as HapticsModule from 'expo-haptics';

export const Haptics = {
  selection: () => HapticsModule.selectionAsync().catch(() => undefined),
  light: () => HapticsModule.impactAsync(HapticsModule.ImpactFeedbackStyle.Light).catch(() => undefined),
  success: () => HapticsModule.notificationAsync(HapticsModule.NotificationFeedbackType.Success).catch(() => undefined),
  error: () => HapticsModule.notificationAsync(HapticsModule.NotificationFeedbackType.Error).catch(() => undefined),
};
