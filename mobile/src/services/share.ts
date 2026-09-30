import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Download a generated file to the cache and open the native share sheet (save, send, etc.). */
export async function downloadAndShare(url: string, mimeType: string): Promise<void> {
  const dir = new Directory(Paths.cache, 'smarttutor');
  if (!dir.exists) dir.create();
  const file = await File.downloadFileAsync(url, dir, { idempotent: true });

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(file.uri, { mimeType });
}
