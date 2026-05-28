import { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Text, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
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
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void fetchInsights(); }} tintColor={Colors.accent.amber} />
        }
      >
        <Text style={styles.heading}>Insights</Text>

        {loading ? (
          <ActivityIndicator color={Colors.accent.amber} style={{ marginTop: 40 }} />
        ) : (
          <>
            {latest ? (
              <InsightCard session={latest} isLatest />
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>Your first insight will appear here after you record a few entries.</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.generateBtn, generating && styles.generateBtnDisabled]}
              onPress={handleGenerate}
              disabled={generating}
            >
              <Text style={styles.generateBtnText}>
                {generating ? 'Generating…' : 'Generate New Insight'}
              </Text>
            </TouchableOpacity>

            {history.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Past Insights</Text>
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
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  heading: { fontSize: 28, fontWeight: '600', color: Colors.text.primary, paddingTop: 8, paddingBottom: 16 },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  emptyText: { color: Colors.text.secondary, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  generateBtn: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.accent.amber,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 32,
  },
  generateBtnDisabled: { opacity: 0.5 },
  generateBtnText: { color: Colors.accent.amber, fontSize: 15, fontWeight: '600' },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: Colors.text.primary, marginBottom: 12 },
});
