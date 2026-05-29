import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, ActivityIndicator, RefreshControl, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { InsightCard } from '../../components/Insights/InsightCard';
import { Colors } from '../../constants/colors';
import type { InsightSession } from '@repo/shared';

export default function InsightsTab() {
  const [sessions, setSessions] = useState<InsightSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function fetchInsights() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/insights`,
      { headers: { Authorization: `Bearer ${session.access_token}` } }
    );
    if (res.ok) setSessions(await res.json() as InsightSession[]);
    setLoading(false);
    setRefreshing(false);
  }

  async function handleGenerate() {
    setGenerating(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/insights/generate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    await fetchInsights();
    setGenerating(false);
  }

  useEffect(() => { void fetchInsights(); }, []);

  const latest = sessions[0] ?? null;
  const history = sessions.slice(1);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); void fetchInsights(); }}
            tintColor={Colors.accent.terracotta}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.heading}>Reflections</Text>
          <Text style={styles.subheading}>AI insights from your journal</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.accent.terracotta} style={{ marginTop: 40 }} />
        ) : (
          <>
            {latest ? (
              <InsightCard session={latest} isLatest />
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyHeadline}>Your first reflection</Text>
                <Text style={styles.emptyBody}>
                  Record a few entries and generate your first AI insight — a thoughtful reflection on your patterns and inner life.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.generateBtn, generating && styles.generateBtnDisabled]}
              onPress={handleGenerate}
              disabled={generating}
            >
              <Text style={styles.generateBtnText}>
                {generating ? 'Reflecting…' : 'Generate new reflection'}
              </Text>
            </TouchableOpacity>

            {history.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Earlier Reflections</Text>
                {history.map((s) => <InsightCard key={s.id} session={s} />)}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  header: {
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    marginBottom: 24,
  },
  heading: {
    fontSize: 32,
    fontWeight: '300',
    color: Colors.text.primary,
    fontFamily: 'Georgia',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  subheading: { fontSize: 13, color: Colors.text.muted },

  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 26,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
    gap: 10,
  },
  emptyHeadline: { fontSize: 20, fontWeight: '300', color: Colors.text.primary, fontFamily: 'Georgia' },
  emptyBody: { fontSize: 14, color: Colors.text.secondary, lineHeight: 22, fontWeight: '300' },

  generateBtn: {
    borderWidth: 1,
    borderColor: Colors.accent.terracotta,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 36,
  },
  generateBtnDisabled: { opacity: 0.4 },
  generateBtnText: { color: Colors.accent.terracotta, fontSize: 15, fontWeight: '500', letterSpacing: 0.3 },

  sectionLabel: {
    fontSize: 11,
    color: Colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: '600',
    marginBottom: 14,
  },
});
