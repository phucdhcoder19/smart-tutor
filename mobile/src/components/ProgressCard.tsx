import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius } from '@/theme';

/** Pipeline stages, keyed by the progress value at which the backend starts each one. */
const STAGES = [
  { from: 0, label: 'Uploading document' },
  { from: 5, label: 'Reading the document' },
  { from: 8, label: 'Writing the lesson' },
  { from: 12, label: 'Finding footage and recording voiceover' },
  { from: 62, label: 'Designing the infographic' },
  { from: 65, label: 'Animating the video' },
];

interface Props {
  progress: number;
  step: string;
}

export function ProgressCard({ progress, step }: Props) {
  const current = STAGES.filter((stage) => progress >= stage.from).length - 1;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.percent}>{progress}%</Text>
        <Text style={styles.step} numberOfLines={2}>
          {step}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max(progress, 3)}%` }]} />
      </View>

      <View style={styles.stages}>
        {STAGES.map((stage, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <View key={stage.label} style={styles.stage}>
              <View style={[styles.marker, done && styles.markerDone, active && styles.markerActive]}>
                {done && <Feather name="check" size={13} color="#fff" />}
                {active && <ActivityIndicator size="small" color={colors.primary} />}
              </View>
              <Text style={[styles.stageLabel, (done || active) && styles.stageLabelOn]}>{stage.label}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.hint}>
        <Feather name="clock" size={14} color={colors.muted} />
        <Text style={styles.hintText}>This usually takes 2 to 4 minutes. Keep the app open.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius, padding: 20, gap: 16 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  percent: { fontFamily: fonts.extrabold, fontSize: 34, letterSpacing: -1, color: colors.primary },
  step: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, color: colors.ink },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.sky, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  stages: { gap: 12, paddingTop: 4 },
  stage: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  marker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerDone: { backgroundColor: colors.accent, borderColor: colors.accent },
  markerActive: { borderColor: 'transparent' },
  stageLabel: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  stageLabelOn: { color: colors.ink, fontFamily: fonts.semibold },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 4 },
  hintText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
});
