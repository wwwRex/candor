import * as VideoThumbnails from 'expo-video-thumbnails';
import { supabase } from './supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const API_BASE = process.env.EXPO_PUBLIC_API_URL!;

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}


export interface UploadResult {
  entry_id: string;
  video_url: string;
  thumbnail_url: string | null;
  transcript: string | null;
  sentiment_summary: string | null;
}

export async function uploadVideoAndTranscribe(
  localUri: string,
  durationSeconds: number,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in. Please sign in and try again.');

  const entry_id = generateId();
  const videoPath = `${session.user.id}/${entry_id}.mp4`;
  const thumbPath = `${session.user.id}/${entry_id}.jpg`;

  onProgress?.(0.05);

  // 1. Generate thumbnail from local video
  let thumbnailUrl: string | null = null;
  try {
    const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(localUri, { time: 1000 });

    const thumbXhr = new XMLHttpRequest();
    const thumbUrl = `${SUPABASE_URL}/storage/v1/object/thumbnails/${thumbPath}`;
    await new Promise<void>((resolve, reject) => {
      thumbXhr.open('POST', thumbUrl);
      thumbXhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
      thumbXhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
      thumbXhr.setRequestHeader('x-upsert', 'true');
      thumbXhr.onreadystatechange = () => {
        if (thumbXhr.readyState !== 4) return;
        if (thumbXhr.status >= 200 && thumbXhr.status < 300) resolve();
        else resolve(); // non-fatal even if it fails
      };
      thumbXhr.onerror = () => resolve(); // non-fatal
      const fd = new FormData();
      fd.append('', { uri: thumbUri, type: 'image/jpeg', name: 'thumb.jpg' } as unknown as Blob);
      thumbXhr.send(fd);
    });
    thumbnailUrl = thumbPath;
  } catch {
    // non-fatal — no thumbnail
  }

  onProgress?.(0.2);

  // 2. Upload video to Supabase Storage via XHR
  const videoUploadUrl = `${SUPABASE_URL}/storage/v1/object/videos/${videoPath}`;
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', videoUploadUrl);
    xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
    xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
    xhr.setRequestHeader('x-upsert', 'true');
    xhr.onreadystatechange = () => {
      if (xhr.readyState !== 4) return;
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Video upload failed: ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('Network error uploading video'));
    const fd = new FormData();
    fd.append('', { uri: localUri, type: 'video/mp4', name: 'video.mp4' } as unknown as Blob);
    xhr.send(fd);
  });

  onProgress?.(0.65);

  // 3. Insert journal entry
  const { error: insertError } = await supabase
    .from('journal_entries')
    .insert({
      id: entry_id,
      user_id: session.user.id,
      video_url: videoPath,
      thumbnail_url: thumbnailUrl,
      duration_seconds: durationSeconds,
      recorded_at: new Date().toISOString(),
    });
  if (insertError) throw new Error(`Failed to save entry: ${insertError.message}`);

  onProgress?.(0.85);

  // 4. Trigger transcription via Netlify (non-fatal)
  let transcript: string | null = null;
  let sentiment_summary: string | null = null;
  try {
    const transcribeRes = await fetch(`${API_BASE}/api/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ entry_id, video_url: videoPath }),
    });
    if (transcribeRes.ok) {
      const result = await transcribeRes.json() as { transcript: string; sentiment_summary: string };
      transcript = result.transcript;
      sentiment_summary = result.sentiment_summary;
    }
  } catch { /* non-fatal */ }

  onProgress?.(1.0);

  return { entry_id, video_url: videoPath, thumbnail_url: thumbnailUrl, transcript, sentiment_summary };
}
