import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, ActivityIndicator, RefreshControl, View } from 'react-native';
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
    if (res.ok) setEntries(await res.json() as JournalEntry[]);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { void fetchEntries(); }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {loading ? (
        <ActivityIndicator color={Colors.accent.terracotta} style={{ marginTop: 60 }} />
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
              tintColor={Colors.accent.terracotta}
            />
          }
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.heading}>Journal</Text>
              <Text style={styles.subheading}>{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyHeadline}>Nothing here yet.</Text>
              <Text style={styles.emptyBody}>Record your first entry and it will appear here.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { paddingHorizontal: 20, paddingBottom: 32 },
  header: {
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    marginBottom: 20,
  },
  heading: {
    fontSize: 32,
    fontWeight: '300',
    color: Colors.text.primary,
    fontFamily: 'Georgia',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  subheading: { fontSize: 13, color: Colors.text.muted, letterSpacing: 0.3 },
  emptyContainer: { paddingTop: 60, alignItems: 'center', gap: 10 },
  emptyHeadline: { fontSize: 20, fontWeight: '300', color: Colors.text.primary, fontFamily: 'Georgia' },
  emptyBody: { fontSize: 14, color: Colors.text.muted, textAlign: 'center', lineHeight: 22 },
});
