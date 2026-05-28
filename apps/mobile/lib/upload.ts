import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

const API_BASE = process.env.EXPO_PUBLIC_API_URL!;

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface UploadResult {
  entry_id: string;
  video_url: string;
  transcript: string | null;
  sentiment_summary: string | null;
}

export async function uploadVideoAndTranscribe(
  localUri: string,
  durationSeconds: number,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  const entry_id = uuidv4();
  const authHeaders = await getAuthHeader();

  // 1. Get signed upload URL
  const urlRes = await fetch(`${API_BASE}/api/upload/signed-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ entry_id, content_type: 'video/mp4' }),
  });
  if (!urlRes.ok) throw new Error('Failed to get upload URL');
  const { signed_url, path } = (await urlRes.json()) as { signed_url: string; path: string };

  // 2. Upload video directly to Supabase Storage
  const uploadResult = await FileSystem.uploadAsync(signed_url, localUri, {
    httpMethod: 'PUT',
    headers: { 'Content-Type': 'video/mp4' },
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
  });

  if (uploadResult.status !== 200 && uploadResult.status !== 204) {
    throw new Error(`Upload failed with status ${uploadResult.status}`);
  }

  onProgress?.(0.5);

  // 3. Create journal entry record
  const entryRes = await fetch(`${API_BASE}/api/journal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({
      id: entry_id,
      video_url: path,
      duration_seconds: durationSeconds,
      recorded_at: new Date().toISOString(),
    }),
  });
  if (!entryRes.ok) throw new Error('Failed to create journal entry');

  onProgress?.(0.7);

  // 4. Trigger transcription
  const transcribeRes = await fetch(`${API_BASE}/api/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ entry_id, video_url: path }),
  });

  onProgress?.(1.0);

  let transcript: string | null = null;
  let sentiment_summary: string | null = null;
  if (transcribeRes.ok) {
    const result = (await transcribeRes.json()) as { transcript: string; sentiment_summary: string };
    transcript = result.transcript;
    sentiment_summary = result.sentiment_summary;
  }

  // 5. Clean up temp file
  await FileSystem.deleteAsync(localUri, { idempotent: true });

  return { entry_id, video_url: path, transcript, sentiment_summary };
}
