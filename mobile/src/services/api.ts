import Constants from 'expo-constants';
import { fetch as expoFetch } from 'expo/fetch';
import { File } from 'expo-file-system';

/**
 * HTTP client for the SmartTutor backend.
 *
 * Release builds use EXPO_PUBLIC_API_URL. In development (Expo Go) it can be left unset: the backend
 * is assumed to run on the same machine as Metro, so the URL follows the laptop across networks.
 */
function resolveApiUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) return configured.replace(/\/$/, '');
  const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
  return devHost ? `http://${devHost}:8000` : 'http://localhost:8000';
}

export const API_URL = resolveApiUrl();

export type TaskStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface GenerationTask {
  task_id: string;
  status: TaskStatus;
  step: string;
  progress: number;
  title: string | null;
  summary: string | null;
  video_url: string | null;
  video_duration: number | null;
  infographic_url: string | null;
  error: string | null;
}

export interface PickedDocument {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
}

export class ApiError extends Error {}

async function parse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(body?.detail ?? `Server error (${response.status})`);
  }
  return body as T;
}

export async function uploadDocument(doc: PickedDocument): Promise<{ task_id: string }> {
  // expo-file-system's File implements Blob, so it can go straight into FormData with expo/fetch.
  const form = new FormData();
  form.append('file', new File(doc.uri), doc.name);

  try {
    const response = await expoFetch(`${API_URL}/api/upload`, { method: 'POST', body: form });
    return await parse(response as unknown as Response);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    const detail = err instanceof Error ? ` (${err.message})` : '';
    throw new ApiError(`Cannot reach the server at ${API_URL}. Check your connection.${detail}`);
  }
}

/** The server returns media paths relative to its root. */
const absolute = (path: string | null) => (path && path.startsWith('/') ? `${API_URL}${path}` : path);

export async function getTask(taskId: string): Promise<GenerationTask> {
  const response = await fetch(`${API_URL}/api/status/${taskId}`);
  const task = await parse<GenerationTask>(response);
  return { ...task, video_url: absolute(task.video_url), infographic_url: absolute(task.infographic_url) };
}
