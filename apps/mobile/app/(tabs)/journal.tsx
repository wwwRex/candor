import { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Text, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { EntryCard } from '../../components/Journal/EntryCard';
import { Colors } from '../../constants/colors';
import type { JournalEntry } from '@repo/shared';

export default function JournalTab() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchEntries() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/journal`,
      { headers: { Authorization: `Bearer ${session.access_token}` } }
    );
    if (res.ok) {
      const data = await res.json() as JournalEntry[];
      setEntries(data);
    }
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { void fetchEntries(); }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.heading}>Journal</Text>
      {loading ? (
        <ActivityIndicator color={Colors.accent.amber} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <EntryCard entry={item} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); void fetchEntries(); }}
              tintColor={Colors.accent.amber}
            />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>No entries yet. Record your first video!</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  heading: { fontSize: 28, fontWeight: '600', color: Colors.text.primary, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  empty: { color: Colors.text.secondary, textAlign: 'center', marginTop: 60, fontSize: 15 },
});
