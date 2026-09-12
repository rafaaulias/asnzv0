import { StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '@/components/app-screen';
import { colors, spacing, type } from '@/theme';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={type.body}>{label}</Text>
      <Text style={type.subhead}>{value}</Text>
    </View>
  );
}

export default function Settings() {
  return (
    <AppScreen>
      <Text style={type.largeTitle}>Settings</Text>
      <View style={styles.list}>
        <Row label="Volume escalation" value="35% → 85%" />
        <Row label="Siren" value="Dual frequency" />
        <Row label="Storage" value="On device" />
        <Row label="Screen awake" value="During challenge" />
      </View>
      <Text style={styles.foot}>
        Android exact alarms and full-screen intent require an EAS build. iOS uses scheduled notifications with a lock-screen interaction fallback.
      </Text>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  list: { borderTopWidth: 1, borderTopColor: colors.border },
  row: { minHeight: 58, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  foot: { ...type.caption, lineHeight: 18 },
});
