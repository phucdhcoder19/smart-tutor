import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ProgressCard } from '@/components/ProgressCard';
import { useGenerationTask } from '@/hooks/useGenerationTask';
import { PickedDocument } from '@/services/api';
import { colors, radius } from '@/theme';

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
];
const MAX_MB = 15;

function formatSize(bytes?: number) {
  if (!bytes) return '';
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
}

export default function UploadScreen() {
  const [doc, setDoc] = useState<PickedDocument | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const { state, start, reset } = useGenerationTask();

  useEffect(() => {
    if (state.phase === 'completed') {
      router.push({ pathname: '/result/[taskId]', params: { taskId: state.task.task_id } });
      reset();
      setDoc(null);
    }
  }, [state, reset]);

  const pickDocument = async () => {
    setPickError(null);
    const result = await DocumentPicker.getDocumentAsync({ type: ACCEPTED_TYPES, copyToCacheDirectory: true });
    if (result.canceled) return;

    const asset = result.assets[0];
    if (asset.size && asset.size > MAX_MB * 1024 * 1024) {
      setPickError(`File is too large (max ${MAX_MB} MB).`);
      return;
    }
    setDoc({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType, size: asset.size });
    reset();
  };

  const busy = state.phase === 'uploading' || state.phase === 'generating';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Turn any document into a training course</Text>
      <Text style={styles.sub}>
        Upload one document. AI creates a narrated training video (under 5 minutes) and an infographic that teaches its
        content.
      </Text>

      <View style={styles.card}>
        {doc ? (
          <View style={styles.fileRow}>
            <Text style={styles.fileIcon}>📄</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.fileName} numberOfLines={2}>
                {doc.name}
              </Text>
              <Text style={styles.fileMeta}>{formatSize(doc.size)}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.placeholder}>PDF, DOCX, TXT or Markdown · up to {MAX_MB} MB</Text>
        )}
        <Button title={doc ? 'Choose another file' : 'Choose document'} variant="outline" onPress={pickDocument} disabled={busy} />
        {pickError && <Text style={styles.error}>{pickError}</Text>}
      </View>

      {doc && !busy && (
        <Button title="Generate training materials" onPress={() => start(doc)} />
      )}

      {state.phase === 'uploading' && <ProgressCard progress={0} step="Uploading document…" />}
      {state.phase === 'generating' && (
        <ProgressCard progress={state.task?.progress ?? 2} step={state.task?.step ?? 'Starting…'} />
      )}

      {state.phase === 'failed' && (
        <View style={[styles.card, styles.errorCard]}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.error}>{state.error}</Text>
          {doc && <Button title="Try again" onPress={() => start(doc)} />}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16 },
  heading: { fontSize: 26, fontWeight: '800', color: colors.text, lineHeight: 32 },
  sub: { fontSize: 15, color: colors.muted, lineHeight: 22 },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: 20, gap: 14 },
  placeholder: { color: colors.muted, textAlign: 'center', fontSize: 14 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fileIcon: { fontSize: 32 },
  fileName: { fontSize: 16, fontWeight: '700', color: colors.text },
  fileMeta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  errorCard: { borderWidth: 1, borderColor: colors.danger },
  errorTitle: { fontSize: 16, fontWeight: '700', color: colors.danger },
  error: { color: colors.danger, fontSize: 14 },
});
