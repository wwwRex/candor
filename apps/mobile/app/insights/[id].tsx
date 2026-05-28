import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';
import type { InsightSession } from '@repo/shared';

export default function InsightDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<InsightSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) return;
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/insights/${id}`, {
        headers: { Authorization: `Bearer ${authSession.access_token}` },
      });
      if (res.ok) setSession(await res.json() as InsightSession);
      setLoading(false);
    }
    void load();
    return () => { soundRef.current?.unloadAsync(); };
  }, [id]);

  async function toggleAudio() {
    if (!session?.audio_url) return;

    if (soundRef.current) {
      if (isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
      return;
    }

    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (!authSession) return;

    const { data: urlData } = await supabase.storage.from('audio').createSignedUrl(session.audio_url, 3600);
    if (!urlData?.signedUrl) return;

    const { sound } = await Audio.Sound.createAsync({ uri: urlData.signedUrl });
    soundRef.current = sound;
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) setIsPlaying(false);
    });
    await sound.playAsync();
    setIsPlaying(true);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={Colors.accent.amber} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.error}>Insight not found.</Text>
      </SafeAreaView>
    );
  }

  const periodLabel = `${new Date(session.period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(session.period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.period}>{periodLabel}</Text>
        <Text style={styles.meta}>{session.entry_count} entries analyzed</Text>

        {session.audio_url && (
          <TouchableOpacity style={styles.audioBtn} onPress={toggleAudio}>
            <Text style={styles.audioBtnText}>
              {isPlaying ? '⏸ Pause narration' : '▶ Play narration'}
            </Text>
          </TouchableOpacity>
        )}

        <Text style={styles.adviceText}>{session.advice_text}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  navBar: { paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { color: Colors.accent.amber, fontSize: 16 },
  content: { paddingHorizontal: 20, paddingBottom: 60 },
  period: { fontSize: 22, fontWeight: '600', color: Colors.text.primary, marginBottom: 4 },
  meta: { fontSize: 13, color: Colors.text.muted, marginBottom: 20 },
  audioBtn: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.accent.amber,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 28,
  },
  audioBtnText: { color: Colors.accent.amber, fontSize: 15, fontWeight: '600' },
  adviceText: { fontSize: 16, color: Colors.text.primary, lineHeight: 28 },
  error: { color: Colors.text.secondary, textAlign: 'center', marginTop: 60, fontSize: 16 },
});
