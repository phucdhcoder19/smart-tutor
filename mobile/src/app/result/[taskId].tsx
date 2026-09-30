import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ComponentProps, ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Infographic } from '@/components/Infographic';
import { TrainingVideo } from '@/components/TrainingVideo';
import { GenerationTask, getTask } from '@/services/api';
import { downloadAndShare } from '@/services/share';
import { colors, fonts, radius } from '@/theme';

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
      <StatusBar style="dark" />
      <View style={styles.ready}>
        <Feather name="check-circle" size={16} color={colors.accent} />
        <Text style={styles.readyText}>Your training is ready</Text>
      </View>
      <Text style={styles.title}>{task.title}</Text>
      {task.summary && <Text style={styles.summary}>{task.summary}</Text>}

      <Section icon="film" title="Training video" badge={formatDuration(task.video_duration)}>
        {task.video_url && <TrainingVideo uri={task.video_url} />}
        <Button
          title="Save or share video"
          icon="share"
          variant="outline"
          loading={sharing === 'video'}
          onPress={() => share('video')}
        />
      </Section>

      <Section icon="image" title="Infographic">
        {task.infographic_url && <Infographic uri={task.infographic_url} />}
        <Button
          title="Save or share infographic"
          icon="share"
          variant="outline"
          loading={sharing === 'image'}
          onPress={() => share('image')}
        />
      </Section>

      <Button title="Create another training" icon="plus" onPress={() => router.back()} />
    </ScrollView>
  );
}

interface SectionProps {
  icon: ComponentProps<typeof Feather>['name'];
  title: string;
  badge?: string;
  children: ReactNode;
}

function Section({ icon, title, badge, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionIcon}>
          <Feather name={icon} size={16} color={colors.ink} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
        {badge ? <Text style={styles.badge}>{badge}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 18, paddingBottom: 48 },
  center: { flex: 1, textAlign: 'center', marginTop: 80, padding: 20 },
  error: { color: colors.danger, fontFamily: fonts.medium },
  ready: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  readyText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.accent },
  title: { marginTop: -6, fontFamily: fonts.extrabold, fontSize: 26, lineHeight: 32, letterSpacing: -0.5, color: colors.ink },
  summary: { marginTop: -6, fontFamily: fonts.regular, fontSize: 15, lineHeight: 23, color: colors.muted },
  section: { backgroundColor: colors.card, borderRadius: radius, padding: 16, gap: 14 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.sun,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { flex: 1, fontFamily: fonts.bold, fontSize: 17, color: colors.ink },
  badge: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.primary,
    backgroundColor: colors.sky,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
});
