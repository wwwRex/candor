import { useState, useRef } from 'react';
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

type Stage = 'home' | 'recording' | 'preview' | 'uploading' | 'goals' | 'done';

const DAILY_PROMPTS = [
  "What's one thing that surprised you today?",
  'Describe your energy level and what drove it.',
  "What's one thing you'd do differently tomorrow?",
  'How did your body feel today?',
  'What are you grateful for right now?',
  'What took up most of your mental space today?',
  'How did you show up for yourself today?',
];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good morning.';
  if (h >= 12 && h < 17) return 'Good afternoon.';
  if (h >= 17 && h < 22) return 'Good evening.';
  return 'Good night.';
}

function getTodayPrompt(): string {
  return DAILY_PROMPTS[new Date().getDay() % DAILY_PROMPTS.length] ?? DAILY_PROMPTS[0]!;
}

export default function RecordTab() {
  const [permission, requestPermission] = useCameraPermissions();
  const [showPrompt, setShowPrompt] = useState(false);
  const [stage, setStage] = useState<Stage>('home');
  const [isRecording, setIsRecording] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [intentions, setIntentions] = useState<string[]>(['']);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const recordingStartRef = useRef<number>(0);
  const cameraRef = useRef<CameraView>(null);
  const [starting, setStarting] = useState(false);

  async function handleStartPress() {
    if (starting) return;
    setStarting(true);
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) { setStarting(false); return; }
    }
    setStage('recording');
  }

  function onCameraReady() {
    setTimeout(() => { void startRecording(); }, 500);
  }

  async function startRecording() {
    if (!cameraRef.current) return;
    setIsRecording(true);
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
      setStarting(false);
      setStage('home');
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
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Upload timed out. Check your connection and try again.')), 45000)
      );
      const result = await Promise.race([
        uploadVideoAndTranscribe(videoUri, videoDuration, setUploadProgress),
        timeout,
      ]);
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
      setStage('home');
    }
  }

  function resetToHome() {
    setStage('home');
    setStarting(false);
    setIntentions(['']);
    setVideoUri(null);
    setVideoDuration(0);
  }

  // Done
  if (stage === 'done') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredView}>
          <Text style={styles.doneHeadline}>Entry received.</Text>
          <View style={styles.ripple}><View style={styles.rippleInner} /></View>
          <Text style={styles.doneBody}>The AI is processing your video.{'\n'}Your reflection will deepen over time.</Text>
          <TouchableOpacity style={styles.ghostBtn} onPress={resetToHome}>
            <Text style={styles.ghostBtnText}>Record another</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Uploading
  if (stage === 'uploading') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredView}>
          <ActivityIndicator size="large" color={Colors.accent.terracotta} />
          <Text style={styles.stateBody}>Saving entry… {Math.round(uploadProgress * 100)}%</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Preview
  if (stage === 'preview') {
    const mins = Math.floor(videoDuration / 60);
    const secs = videoDuration % 60;
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredView}>
          <Text style={styles.previewHeadline}>Entry captured.</Text>
          <Text style={styles.previewDuration}>{mins > 0 ? `${mins}m ${secs}s` : `${secs}s`}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setStage('goals')}>
            <Text style={styles.primaryBtnText}>Continue</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostBtn} onPress={() => { setVideoUri(null); setStage('home'); }}>
            <Text style={styles.ghostBtnText}>Retake</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Goals
  if (stage === 'goals') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.goalsContent}>
          <Text style={styles.goalsHeadline}>Set your intentions.</Text>
          <Text style={styles.goalsSubtitle}>What would you like to carry forward today?</Text>
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
            />
          ))}
          {intentions.length < 3 && (
            <TouchableOpacity onPress={() => setIntentions([...intentions, ''])}>
              <Text style={styles.addLink}>+ Add another</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.primaryBtn, { marginTop: 36 }]} onPress={handleSubmit}>
            <Text style={styles.primaryBtnText}>Save Entry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ marginTop: 14, alignItems: 'center' }} onPress={handleSubmit}>
            <Text style={styles.skipLink}>Skip for now</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Recording — full-screen camera
  if (stage === 'recording') {
    return (
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" mode="video" onCameraReady={onCameraReady} />
        {showPrompt && (
          <SafeAreaView style={styles.promptOverlay} edges={['top']}>
            <View style={styles.cameraBubble}>
              <Text style={styles.cameraPromptLabel}>Prompt</Text>
              <Text style={styles.cameraPromptText}>{getTodayPrompt()}</Text>
            </View>
          </SafeAreaView>
        )}
        <SafeAreaView style={styles.cameraControls} edges={['bottom']}>
          {!isRecording ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <>
              <TouchableOpacity style={styles.stopBtn} onPress={stopRecording}>
                <View style={styles.stopBtnInner} />
              </TouchableOpacity>
              <Text style={styles.recordHint}>Tap to stop</Text>
            </>
          )}
        </SafeAreaView>
      </View>
    );
  }

  // Home — the main screen
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.homeContent} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.homeHeader}>
          <Text style={styles.appName}>Candor</Text>
        </View>

        {/* Greeting */}
        <View style={styles.greetingSection}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.greetingSubtext}>Take a moment to reflect.</Text>
        </View>

        {/* Mode toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, !showPrompt && styles.modeBtnActive]}
            onPress={() => setShowPrompt(false)}
          >
            <Text style={[styles.modeBtnText, !showPrompt && styles.modeBtnTextActive]}>Free Speech</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, showPrompt && styles.modeBtnActive]}
            onPress={() => setShowPrompt(true)}
          >
            <Text style={[styles.modeBtnText, showPrompt && styles.modeBtnTextActive]}>Prompted</Text>
          </TouchableOpacity>
        </View>

        {/* Prompt card — only in prompted mode */}
        {showPrompt && (
          <View style={styles.promptCard}>
            <Text style={styles.promptCardLabel}>Today's prompt</Text>
            <Text style={styles.promptCardText}>{getTodayPrompt()}</Text>
          </View>
        )}

        {/* Record CTA */}
        <View style={styles.recordSection}>
          <TouchableOpacity style={styles.recordButton} onPress={handleStartPress} activeOpacity={0.75}>
            <View style={styles.recordRing}>
              <View style={styles.recordDot} />
            </View>
            <Text style={styles.recordLabel}>Begin today's entry</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  cameraContainer: { flex: 1, backgroundColor: '#000' },

  homeContent: { paddingHorizontal: 28, paddingBottom: 48 },
  homeHeader: {
    paddingTop: 20,
    paddingBottom: 36,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  appName: {
    fontSize: 15,
    fontWeight: '400',
    color: Colors.text.secondary,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },

  greetingSection: { paddingTop: 44, paddingBottom: 36 },
  greeting: {
    fontSize: 34,
    fontWeight: '300',
    color: Colors.text.primary,
    fontFamily: 'Georgia',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  greetingSubtext: { fontSize: 16, color: Colors.text.secondary, fontWeight: '300', letterSpacing: 0.2 },

  modeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 3,
    marginBottom: 28,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 10,
  },
  modeBtnActive: {
    backgroundColor: Colors.background,
    shadowColor: '#2D2926',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  modeBtnText: { fontSize: 13, color: Colors.text.muted, fontWeight: '500', letterSpacing: 0.2 },
  modeBtnTextActive: { color: Colors.text.primary },

  promptCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 22,
    marginBottom: 40,
  },
  promptCardLabel: { fontSize: 11, color: Colors.accent.terracotta, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '600', marginBottom: 14 },
  promptCardText: { fontSize: 19, color: Colors.text.primary, lineHeight: 30, fontWeight: '300', fontFamily: 'Georgia' },

  recordSection: { alignItems: 'center', paddingTop: 8 },
  recordButton: { alignItems: 'center', gap: 20 },
  recordRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    borderColor: Colors.accent.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent.terracottaDim,
  },
  recordDot: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.accent.terracotta,
  },
  recordLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    letterSpacing: 0.5,
    fontWeight: '400',
  },

  // Camera
  promptOverlay: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 20 },
  cameraBubble: {
    backgroundColor: 'rgba(251,248,244,0.9)',
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
  },
  cameraPromptLabel: { fontSize: 10, color: Colors.accent.terracotta, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4, fontWeight: '600' },
  cameraPromptText: { fontSize: 15, color: Colors.text.primary, lineHeight: 22 },
  cameraControls: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingBottom: 40 },
  stopBtn: { width: 76, height: 76, borderRadius: 38, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  stopBtnInner: { width: 26, height: 26, borderRadius: 5, backgroundColor: '#fff' },
  recordHint: { color: 'rgba(255,255,255,0.6)', marginTop: 12, fontSize: 13, letterSpacing: 0.3 },

  // States
  centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 36, gap: 20 },
  doneHeadline: { fontSize: 28, fontWeight: '300', color: Colors.text.primary, textAlign: 'center', fontFamily: 'Georgia', lineHeight: 38 },
  ripple: { width: 72, height: 72, borderRadius: 36, borderWidth: 1, borderColor: Colors.accent.terracotta, alignItems: 'center', justifyContent: 'center' },
  rippleInner: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: Colors.accent.terracotta, opacity: 0.5 },
  doneBody: { fontSize: 15, color: Colors.text.secondary, textAlign: 'center', lineHeight: 24, fontWeight: '300' },
  previewHeadline: { fontSize: 28, fontWeight: '300', color: Colors.text.primary, fontFamily: 'Georgia' },
  previewDuration: { fontSize: 15, color: Colors.text.muted, letterSpacing: 1 },
  stateBody: { fontSize: 15, color: Colors.text.secondary, textAlign: 'center' },

  primaryBtn: { width: '100%', backgroundColor: Colors.accent.terracotta, borderRadius: 14, paddingVertical: 17, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '500', letterSpacing: 0.3 },
  ghostBtn: { width: '100%', borderWidth: 1, borderColor: Colors.border, borderRadius: 14, paddingVertical: 17, alignItems: 'center' },
  ghostBtnText: { color: Colors.text.secondary, fontSize: 15 },

  goalsContent: { paddingHorizontal: 28, paddingTop: 60, paddingBottom: 40 },
  goalsHeadline: { fontSize: 30, fontWeight: '300', color: Colors.text.primary, fontFamily: 'Georgia', marginBottom: 10 },
  goalsSubtitle: { fontSize: 15, color: Colors.text.secondary, lineHeight: 24, marginBottom: 32, fontWeight: '300' },
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
  addLink: { color: Colors.accent.terracotta, fontSize: 14, marginTop: 4 },
  skipLink: { color: Colors.text.muted, fontSize: 14 },
});
