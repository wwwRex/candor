import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { uploadVideoAndTranscribe } from '../../lib/upload';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';

type Stage = 'prompt' | 'recording' | 'preview' | 'uploading' | 'goals' | 'done';

const DAILY_PROMPTS = [
  'What's one thing that surprised you today?',
  'Describe your energy level and what drove it.',
  'What's one thing you want to do differently tomorrow?',
  'How did your body feel today?',
  'What are you grateful for right now?',
  'What took up most of your mental space today?',
  'How did you show up for yourself today?',
];

function getTodayPrompt(): string {
  const dayIndex = new Date().getDay();
  return DAILY_PROMPTS[dayIndex % DAILY_PROMPTS.length] ?? DAILY_PROMPTS[0]!;
}

export default function RecordTab() {
  const [permission, requestPermission] = useCameraPermissions();
  const [recordingMode, setRecordingMode] = useState<'guided' | 'quick'>('guided');
  const [stage, setStage] = useState<Stage>('prompt');
  const [isRecording, setIsRecording] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [intentions, setIntentions] = useState<string[]>(['']);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const recordingStartRef = useRef<number>(0);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    supabase
      .from('users')
      .select('recording_mode')
      .eq('id', (supabase.auth as unknown as { currentUser?: { id: string } }).currentUser?.id ?? '')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.recording_mode) setRecordingMode(data.recording_mode as 'guided' | 'quick');
      });
  }, []);

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionView}>
          <Text style={styles.permissionTitle}>Camera Access</Text>
          <Text style={styles.permissionBody}>
            Candor needs camera access to record your daily video entries.
          </Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>Grant Access</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  async function startRecording() {
    if (!cameraRef.current) return;
    setIsRecording(true);
    setStage('recording');
    recordingStartRef.current = Date.now();
    try {
      const video = await cameraRef.current.recordAsync({ maxDuration: 180 });
      if (video?.uri) {
        setVideoUri(video.uri);
        setVideoDuration(Math.round((Date.now() - recordingStartRef.current) / 1000));
        setStage('preview');
      }
    } catch {
      setIsRecording(false);
      setStage('prompt');
    }
  }

  async function stopRecording() {
    cameraRef.current?.stopRecording();
    setIsRecording(false);
  }

  async function handleSubmit() {
    if (!videoUri) return;
    setStage('uploading');
    try {
      const result = await uploadVideoAndTranscribe(videoUri, videoDuration, setUploadProgress);
      setEntryId(result.entry_id);

      // Save daily intentions
      const validIntentions = intentions.filter((i) => i.trim());
      const { data: { session } } = await supabase.auth.getSession();
      if (session && validIntentions.length > 0) {
        await Promise.all(
          validIntentions.map((title) =>
            fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/journal/intentions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
              body: JSON.stringify({ entry_id: result.entry_id, title }),
            })
          )
        );
      }
      setStage('done');
    } catch (err) {
      Alert.alert('Upload failed', (err as Error).message);
      setStage('prompt');
    }
  }

  // Done state
  if (stage === 'done') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.doneView}>
          <Text style={styles.doneEmoji}>✓</Text>
          <Text style={styles.doneTitle}>Entry recorded</Text>
          <Text style={styles.doneBody}>Your video is being transcribed. Check back soon.</Text>
          <TouchableOpacity style={styles.doneBtn} onPress={() => { setStage('prompt'); setIntentions(['']); setVideoUri(null); setVideoDuration(0); }}>
            <Text style={styles.doneBtnText}>Record Another</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Uploading state
  if (stage === 'uploading') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.doneView}>
          <ActivityIndicator size="large" color={Colors.accent.amber} />
          <Text style={styles.doneTitle}>Uploading…</Text>
          <Text style={styles.doneBody}>{Math.round(uploadProgress * 100)}%</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Preview stage
  if (stage === 'preview') {
    const mins = Math.floor(videoDuration / 60);
    const secs = videoDuration % 60;
    const durationLabel = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.doneView}>
          <Text style={styles.doneEmoji}>🎥</Text>
          <Text style={styles.doneTitle}>Entry recorded</Text>
          <Text style={styles.doneBody}>{durationLabel} · Looks good?</Text>
          <TouchableOpacity style={styles.submitBtn} onPress={() => setStage('goals')}>
            <Text style={styles.submitBtnText}>Continue</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.doneBtn} onPress={() => { setVideoUri(null); setStage('prompt'); }}>
            <Text style={styles.doneBtnText}>Retake</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Goals / intentions stage
  if (stage === 'goals') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.goalsContent}>
          <Text style={styles.goalsTitle}>Daily Intentions</Text>
          <Text style={styles.goalsSubtitle}>What do you want to accomplish today? (optional)</Text>
          {intentions.map((val, idx) => (
            <TextInput
              key={idx}
              style={styles.intentionInput}
              placeholder={`Intention ${idx + 1}`}
              placeholderTextColor={Colors.text.muted}
              value={val}
              onChangeText={(t) => {
                const next = [...intentions];
                next[idx] = t;
                setIntentions(next);
              }}
              returnKeyType="next"
            />
          ))}
          {intentions.length < 3 && (
            <TouchableOpacity onPress={() => setIntentions([...intentions, ''])}>
              <Text style={styles.addIntention}>+ Add another</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={() => handleSubmit()}
          >
            <Text style={styles.submitBtnText}>Submit Entry</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="front"
        mode="video"
      />

      {/* Guided prompt overlay */}
      {recordingMode === 'guided' && stage === 'prompt' && (
        <SafeAreaView style={styles.promptOverlay} edges={['top']}>
          <View style={styles.promptBubble}>
            <Text style={styles.promptLabel}>Today's prompt</Text>
            <Text style={styles.promptText}>{getTodayPrompt()}</Text>
          </View>
        </SafeAreaView>
      )}

      {/* Record controls */}
      <SafeAreaView style={styles.controls} edges={['bottom']}>
        {!isRecording ? (
          <TouchableOpacity style={styles.recordBtn} onPress={startRecording}>
            <View style={styles.recordBtnInner} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.stopBtn} onPress={stopRecording}>
            <View style={styles.stopBtnInner} />
          </TouchableOpacity>
        )}
        <Text style={styles.recordHint}>
          {isRecording ? 'Tap to stop' : 'Tap to record'}
        </Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  permissionView: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 16 },
  permissionTitle: { fontSize: 24, fontWeight: '600', color: Colors.text.primary, textAlign: 'center' },
  permissionBody: { fontSize: 15, color: Colors.text.secondary, textAlign: 'center', lineHeight: 22 },
  permissionBtn: { backgroundColor: Colors.accent.amber, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 },
  permissionBtnText: { color: Colors.background, fontSize: 16, fontWeight: '600' },
  promptOverlay: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 20 },
  promptBubble: {
    backgroundColor: 'rgba(14,14,16,0.85)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 16,
  },
  promptLabel: { fontSize: 11, fontWeight: '600', color: Colors.accent.amber, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  promptText: { fontSize: 17, color: Colors.text.primary, lineHeight: 24 },
  controls: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingBottom: 32 },
  recordBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordBtnInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
  stopBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopBtnInner: { width: 30, height: 30, borderRadius: 6, backgroundColor: Colors.danger },
  recordHint: { color: 'rgba(255,255,255,0.7)', marginTop: 12, fontSize: 13 },
  doneView: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 16 },
  doneEmoji: { fontSize: 48, color: Colors.accent.sage },
  doneTitle: { fontSize: 24, fontWeight: '600', color: Colors.text.primary },
  doneBody: { fontSize: 15, color: Colors.text.secondary, textAlign: 'center', lineHeight: 22 },
  doneBtn: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14, marginTop: 8 },
  doneBtnText: { color: Colors.text.primary, fontSize: 16, fontWeight: '500' },
  goalsContent: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  goalsTitle: { fontSize: 26, fontWeight: '600', color: Colors.text.primary, marginBottom: 8 },
  goalsSubtitle: { fontSize: 15, color: Colors.text.secondary, lineHeight: 22, marginBottom: 24 },
  intentionInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.text.primary,
    fontSize: 16,
    marginBottom: 12,
  },
  addIntention: { color: Colors.accent.amber, fontSize: 15, marginBottom: 32 },
  submitBtn: { backgroundColor: Colors.accent.amber, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  submitBtnText: { color: Colors.background, fontSize: 16, fontWeight: '600' },
});
