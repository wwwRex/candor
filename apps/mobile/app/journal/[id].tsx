import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';
import type { JournalEntry } from '@repo/shared';

export default function JournalEntryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/journal/${id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) setEntry(await res.json() as JournalEntry);
      setLoading(false);
    }
    void load();
  }, [id]);

  async function toggleIntention(intentionId: string, completed: boolean) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !entry) return;
    await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/journal/intentions/${intentionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ completed: !completed }),
    });
    setEntry({
      ...entry,
      daily_intentions: entry.daily_intentions?.map((i) =>
        i.id === intentionId ? { ...i, completed: !completed } : i
      ),
    });
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={Colors.accent.amber} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (!entry) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.error}>Entry not found.</Text>
      </SafeAreaView>
    );
  }

  const date = new Date(entry.recorded_at).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.date}>{date}</Text>

        {entry.sentiment_summary && (
          <View style={styles.sentimentBadge}>
            <Text style={styles.sentimentText}>{entry.sentiment_summary}</Text>
          </View>
        )}

        {entry.transcript ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transcript</Text>
            <Text style={styles.transcript}>{entry.transcript}</Text>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.pending}>Transcription in progress…</Text>
          </View>
        )}

        {(entry.daily_intentions ?? []).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Daily Intentions</Text>
            {entry.daily_intentions!.map((intention) => (
              <TouchableOpacity
                key={intention.id}
                style={styles.intentionRow}
                onPress={() => toggleIntention(intention.id, intention.completed)}
              >
                <View style={[styles.checkbox, intention.completed && styles.checkboxDone]}>
                  {intention.completed && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.intentionText, intention.completed && styles.intentionDone]}>
                  {intention.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  navBar: { paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { color: Colors.accent.amber, fontSize: 16 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  date: { fontSize: 22, fontWeight: '600', color: Colors.text.primary, marginBottom: 12 },
  sentimentBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${Colors.accent.amber}22`,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 20,
  },
  sentimentText: { fontSize: 13, color: Colors.accent.amber },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  transcript: { fontSize: 16, color: Colors.text.primary, lineHeight: 26 },
  pending: { fontSize: 15, color: Colors.text.muted, fontStyle: 'italic' },
  error: { color: Colors.text.secondary, textAlign: 'center', marginTop: 60, fontSize: 16 },
  intentionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: Colors.accent.sage, borderColor: Colors.accent.sage },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: '700' },
  intentionText: { fontSize: 15, color: Colors.text.primary, flex: 1 },
  intentionDone: { color: Colors.text.muted, textDecorationLine: 'line-through' },
});
