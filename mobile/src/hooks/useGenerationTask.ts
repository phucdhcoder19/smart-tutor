import { useCallback, useEffect, useRef, useState } from 'react';

import { GenerationTask, getTask, PickedDocument, uploadDocument } from '@/services/api';

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ERRORS = 5;

type State =
  | { phase: 'idle' }
  | { phase: 'uploading' }
  | { phase: 'generating'; task: GenerationTask | null }
  | { phase: 'failed'; error: string };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Uploads a document, then polls the backend until the training materials are ready.
 * Generation takes 2-4 minutes, so the server works in the background and we poll.
 * Each run gets an id; starting again, resetting or unmounting bumps it, which stops the old loop.
 */
export function useGenerationTask(onCompleted: (task: GenerationTask) => void) {
  const [state, setState] = useState<State>({ phase: 'idle' });
  const runId = useRef(0);
  const completed = useRef(onCompleted);

  useEffect(() => {
    completed.current = onCompleted;
  }, [onCompleted]);

  useEffect(() => () => void runId.current++, []);

  const start = useCallback(async (doc: PickedDocument) => {
    const id = ++runId.current;
    const active = () => runId.current === id;
    setState({ phase: 'uploading' });

    let taskId: string;
    try {
      ({ task_id: taskId } = await uploadDocument(doc));
    } catch (err) {
      if (active()) setState({ phase: 'failed', error: err instanceof Error ? err.message : 'Upload failed.' });
      return;
    }
    if (!active()) return;
    setState({ phase: 'generating', task: null });

    let errors = 0;
    while (true) {
      await sleep(POLL_INTERVAL_MS);
      if (!active()) return;

      let task: GenerationTask;
      try {
        task = await getTask(taskId);
        errors = 0;
      } catch {
        // Tolerate short network hiccups (e.g. switching Wi-Fi) before giving up.
        if (++errors >= MAX_POLL_ERRORS) return setState({ phase: 'failed', error: 'Lost connection to the server.' });
        continue;
      }
      if (!active()) return;

      if (task.status === 'completed') {
        setState({ phase: 'idle' });
        return completed.current(task);
      }
      if (task.status === 'failed') return setState({ phase: 'failed', error: task.error ?? 'Generation failed.' });
      setState({ phase: 'generating', task });
    }
  }, []);

  const reset = useCallback(() => {
    runId.current++;
    setState({ phase: 'idle' });
  }, []);

  return { state, start, reset };
}
