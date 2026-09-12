import { StyleSheet, Switch, Text, View } from 'react-native';
import { AppScreen } from '@/components/app-screen';
import { colors, radius, spacing, type } from '@/theme';

function Row({ label, value, toggle }: { label: string; value?: string; toggle?: boolean }) {
  return <View style={styles.row}><View><Text style={type.body}>{label}</Text>{value ? <Text style={styles.detail}>{value}</Text> : null}</View>{toggle ? <Switch value trackColor={{ false: colors.disabled, true: colors.ink }} thumbColor={colors.paper} /> : <Text style={type.subhead}>›</Text>}</View>;
}

export default function Settings() {
  return <AppScreen><Text style={type.largeTitle}>Settings</Text><Text style={styles.sub}>Make waking up work for you.</Text><View style={styles.card}><Row label="Alarm sound" value="Radar" /><Row label="Volume escalation" value="35% → 85%" /><Row label="Keep screen awake" toggle /><Row label="Haptics" toggle /></View><Text style={styles.sectionTitle}>About Anti-Snooze</Text><View style={styles.card}><Row label="Storage" value="On device" /><Row label="Privacy" value="No account required" /></View><Text style={styles.foot}>Alarm scheduling and challenge data stay on your device.</Text></AppScreen>;
}

const styles = StyleSheet.create({
  sub: { ...type.subhead, marginTop: -spacing.sm },
  sectionTitle: { ...type.headline, marginTop: spacing.sm },
  card: { borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md },
  row: { minHeight: 62, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detail: { ...type.caption, marginTop: 2, color: colors.faintText },
  foot: { ...type.caption, lineHeight: 18 },
});
