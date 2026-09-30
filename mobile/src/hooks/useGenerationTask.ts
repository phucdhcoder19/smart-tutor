import { useCallback, useEffect, useRef, useState } from 'react';

import { GenerationTask, getTask, PickedDocument, uploadDocument } from '@/services/api';

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ERRORS = 5;

type State =
  | { phase: 'idle' }
  | { phase: 'uploading' }
  | { phase: 'generating'; task: GenerationTask | null }
  | { phase: 'completed'; task: GenerationTask }
  | { phase: 'failed'; error: string };

/**
 * Uploads a document, then polls the backend until the training materials are ready.
 * Generation takes 2-4 minutes, so the server works in the background and we poll.
 */
export function useGenerationTask() {
  const [state, setState] = useState<State>({ phase: 'idle' });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  useEffect(() => stopPolling, []);

  const poll = useCallback((taskId: string, errors = 0) => {
    timer.current = setTimeout(async () => {
      try {
        const task = await getTask(taskId);
        if (task.status === 'completed') return setState({ phase: 'completed', task });
        if (task.status === 'failed') return setState({ phase: 'failed', error: task.error ?? 'Generation failed.' });
        setState({ phase: 'generating', task });
        poll(taskId, 0);
      } catch {
        // Tolerate short network hiccups (e.g. switching Wi-Fi) before giving up.
        if (errors + 1 >= MAX_POLL_ERRORS) {
          return setState({ phase: 'failed', error: 'Lost connection to the server.' });
        }
        poll(taskId, errors + 1);
      }
    }, POLL_INTERVAL_MS);
  }, []);

  const start = useCallback(
    async (doc: PickedDocument) => {
      stopPolling();
      setState({ phase: 'uploading' });
      try {
        const { task_id } = await uploadDocument(doc);
        setState({ phase: 'generating', task: null });
        poll(task_id);
      } catch (err) {
        setState({ phase: 'failed', error: err instanceof Error ? err.message : 'Upload failed.' });
      }
    },
    [poll],
  );

  const reset = useCallback(() => {
    stopPolling();
    setState({ phase: 'idle' });
  }, []);

  return { state, start, reset };
}
