import { Tabs } from 'expo-router';
import { BottomTabBar } from '@/components/bottom-tab-bar';
import { useTranslation } from '@/i18n';

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <BottomTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: t('tabAlarms') }} />
      <Tabs.Screen name="stats" options={{ title: t('tabStats') }} />
      <Tabs.Screen name="settings" options={{ title: t('tabSettings') }} />
    </Tabs>
  );
}
