import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '@/theme';

interface Props {
  progress: number;
  step: string;
}

export function ProgressCard({ progress, step }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.percent}>{progress}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max(progress, 3)}%` }]} />
      </View>
      <Text style={styles.step}>{step}</Text>
      <Text style={styles.hint}>This usually takes 2–4 minutes. Keep the app open.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius, padding: 20, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  percent: { fontSize: 22, fontWeight: '800', color: colors.text },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.primary, borderRadius: 5 },
  step: { fontSize: 15, color: colors.text, fontWeight: '600' },
  hint: { fontSize: 13, color: colors.muted },
});
