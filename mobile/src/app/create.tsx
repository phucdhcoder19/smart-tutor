import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ProgressCard } from '@/components/ProgressCard';
import { useGenerationTask } from '@/hooks/useGenerationTask';
import { GenerationTask, PickedDocument } from '@/services/api';
import { colors, fonts, radius } from '@/theme';

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

const extension = (name: string) => name.split('.').pop()?.toUpperCase() ?? 'FILE';

export default function CreateScreen() {
  const insets = useSafeAreaInsets();
  const [doc, setDoc] = useState<PickedDocument | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const onCompleted = useCallback((task: GenerationTask) => {
    setDoc(null);
    router.push({ pathname: '/result/[taskId]', params: { taskId: task.task_id } });
  }, []);
  const { state, start, reset } = useGenerationTask(onCompleted);

  const pickDocument = async () => {
    setPickError(null);
    const result = await DocumentPicker.getDocumentAsync({ type: ACCEPTED_TYPES, copyToCacheDirectory: true });
    if (result.canceled) return;

    const asset = result.assets[0];
    if (asset.size && asset.size > MAX_MB * 1024 * 1024) {
      setPickError(`This file is ${formatSize(asset.size)}. Choose one under ${MAX_MB} MB.`);
      return;
    }
    setDoc({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType, size: asset.size });
    reset();
  };

  const busy = state.phase === 'uploading' || state.phase === 'generating';

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 120 + insets.bottom }]}>
        <Text style={styles.heading}>{busy ? 'Building your training' : 'Choose a document'}</Text>
        <Text style={styles.sub}>
          {busy
            ? 'AI is turning your document into a video and an infographic.'
            : 'AI reads it, picks the key ideas and teaches them in a short video and an infographic.'}
        </Text>

        {doc ? (
          <View style={styles.fileCard}>
            <View style={styles.fileBadge}>
              <Feather name="file-text" size={22} color={colors.primary} />
              <Text style={styles.fileExt}>{extension(doc.name)}</Text>
            </View>
            <View style={styles.fileInfo}>
              <Text style={styles.fileName} numberOfLines={2}>
                {doc.name}
              </Text>
              <Text style={styles.fileMeta}>{formatSize(doc.size)}</Text>
            </View>
            {!busy && (
              <Pressable onPress={pickDocument} hitSlop={10} accessibilityRole="button">
                <Text style={styles.change}>Change</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <Pressable
            onPress={pickDocument}
            accessibilityRole="button"
            style={({ pressed }) => [styles.dropzone, pressed && styles.dropzonePressed]}
          >
            <View style={styles.dropIcon}>
              <Feather name="upload-cloud" size={28} color={colors.primary} />
            </View>
            <Text style={styles.dropTitle}>Tap to choose a file</Text>
            <Text style={styles.dropMeta}>PDF, DOCX, TXT or Markdown, up to {MAX_MB} MB</Text>
          </Pressable>
        )}

        {pickError && <Text style={styles.inlineError}>{pickError}</Text>}

        {state.phase === 'uploading' && <ProgressCard progress={0} step="Uploading document" />}
        {state.phase === 'generating' && (
          <ProgressCard progress={state.task?.progress ?? 2} step={state.task?.step ?? 'Starting'} />
        )}

        {state.phase === 'failed' && (
          <View style={styles.errorCard}>
            <Feather name="alert-circle" size={20} color={colors.danger} />
            <View style={{ flex: 1 }}>
              <Text style={styles.errorTitle}>The training could not be created</Text>
              <Text style={styles.errorText}>{state.error}</Text>
            </View>
          </View>
        )}

        {!busy && state.phase !== 'failed' && (
          <View style={styles.outputs}>
            <Text style={styles.outputsTitle}>You will get</Text>
            <Output icon="film" title="Training video" detail="Narrated with real footage, under 5 minutes" />
            <Output icon="image" title="Infographic" detail="A one-page summary to save or share" />
          </View>
        )}
      </ScrollView>

      {doc && !busy && (
        <View style={[styles.cta, { paddingBottom: insets.bottom + 16 }]}>
          <Button
            title={state.phase === 'failed' ? 'Try again' : 'Generate training'}
            icon={state.phase === 'failed' ? 'refresh-cw' : 'zap'}
            onPress={() => start(doc)}
          />
        </View>
      )}
    </View>
  );
}

function Output({ icon, title, detail }: { icon: 'film' | 'image'; title: string; detail: string }) {
  return (
    <View style={styles.output}>
      <View style={styles.outputIcon}>
        <Feather name={icon} size={18} color={colors.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.outputTitle}>{title}</Text>
        <Text style={styles.outputDetail}>{detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { padding: 20, gap: 16 },
  heading: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34, letterSpacing: -0.6, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.muted, marginTop: -6 },

  dropzone: {
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    borderRadius: radius,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#B9CBF5',
    backgroundColor: colors.card,
  },
  dropzonePressed: { backgroundColor: colors.sky },
  dropIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.sky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropTitle: { marginTop: 16, fontFamily: fonts.bold, fontSize: 17, color: colors.ink },
  dropMeta: { marginTop: 6, fontFamily: fonts.regular, fontSize: 13, color: colors.muted, textAlign: 'center' },

  fileCard: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: radius,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fileBadge: {
    width: 52,
    height: 60,
    borderRadius: 10,
    backgroundColor: colors.sky,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  fileExt: { fontFamily: fonts.bold, fontSize: 10, color: colors.primary },
  fileInfo: { flex: 1 },
  fileName: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, color: colors.ink },
  fileMeta: { marginTop: 3, fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  change: { fontFamily: fonts.bold, fontSize: 14, color: colors.primary },

  inlineError: { fontFamily: fonts.medium, fontSize: 14, color: colors.danger },
  errorCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: radius,
    backgroundColor: colors.dangerSoft,
  },
  errorTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.danger },
  errorText: { marginTop: 4, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.ink },

  outputs: { marginTop: 12, gap: 12 },
  outputsTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  output: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  outputIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.sun,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outputTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  outputDetail: { marginTop: 2, fontFamily: fonts.regular, fontSize: 13, color: colors.muted },

  cta: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
