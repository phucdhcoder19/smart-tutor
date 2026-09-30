import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Infographic } from '@/components/Infographic';
import { TrainingVideo } from '@/components/TrainingVideo';
import { GenerationTask, getTask } from '@/services/api';
import { downloadAndShare } from '@/services/share';
import { colors, radius } from '@/theme';

function formatDuration(seconds: number | null) {
  if (!seconds) return '';
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function ResultScreen() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const [task, setTask] = useState<GenerationTask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState<'video' | 'image' | null>(null);

  useEffect(() => {
    getTask(taskId).then(setTask).catch((e) => setError(e.message));
  }, [taskId]);

  const share = async (kind: 'video' | 'image') => {
    if (!task) return;
    setSharing(kind);
    try {
      const url = kind === 'video' ? task.video_url! : task.infographic_url!;
      await downloadAndShare(url, kind === 'video' ? 'video/mp4' : 'image/png');
    } catch (e) {
      Alert.alert('Could not share', e instanceof Error ? e.message : String(e));
    } finally {
      setSharing(null);
    }
  };

  if (error) return <Text style={[styles.center, styles.error]}>{error}</Text>;
  if (!task) return <ActivityIndicator style={styles.center} color={colors.primary} />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{task.title}</Text>
      {task.summary && <Text style={styles.summary}>{task.summary}</Text>}

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>🎬 Training video</Text>
          <Text style={styles.badge}>{formatDuration(task.video_duration)}</Text>
        </View>
        {task.video_url && <TrainingVideo uri={task.video_url} />}
        <Button title="Save / share video" variant="outline" loading={sharing === 'video'} onPress={() => share('video')} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🖼️ Infographic</Text>
        {task.infographic_url && <Infographic uri={task.infographic_url} />}
        <Button title="Save / share infographic" variant="outline" loading={sharing === 'image'} onPress={() => share('image')} />
      </View>

      <Button title="Create from another document" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 20, paddingBottom: 40 },
  center: { flex: 1, textAlign: 'center', marginTop: 80, padding: 20 },
  error: { color: colors.danger },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, lineHeight: 30 },
  summary: { fontSize: 15, color: colors.muted, lineHeight: 22 },
  section: { backgroundColor: colors.card, borderRadius: radius, padding: 16, gap: 14 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  badge: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: '#e8f0fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
});
