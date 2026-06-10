import { useEffect, useState, useCallback } from 'react';
import { FlatList, StyleSheet, Text, ActivityIndicator, RefreshControl, View, Image, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';
import type { JournalEntry } from '@repo/shared';

const GRID_COLUMNS = 3;
const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_SIZE = (SCREEN_WIDTH - 4) / GRID_COLUMNS;

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function GridCell({ entry, thumbUrl }: { entry: JournalEntry; thumbUrl: string | null }) {
  const router = useRouter();
  return (
    <TouchableOpacity style={styles.cell} onPress={() => router.push(`/journal/${entry.id}`)} activeOpacity={0.85}>
      {thumbUrl ? (
        <Image source={{ uri: thumbUrl }} style={styles.cellImage} resizeMode="cover" />
      ) : (
        <View style={styles.cellPlaceholder}>
          <View style={styles.placeholderIcon} />
        </View>
      )}
      <View style={styles.cellOverlay}>
        {entry.sentiment_summary && (
          <Text style={styles.cellSentiment} numberOfLines={1}>{entry.sentiment_summary}</Text>
        )}
        <Text style={styles.cellDate}>{formatDateShort(entry.recorded_at)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function JournalTab() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadThumbnails = useCallback(async (items: JournalEntry[]) => {
    const urls: Record<string, string> = {};
    await Promise.all(
      items
        .filter((e) => (e as unknown as { thumbnail_url?: string }).thumbnail_url)
        .map(async (e) => {
          const thumbPath = (e as unknown as { thumbnail_url: string }).thumbnail_url;
          const { data } = await supabase.storage.from('thumbnails').createSignedUrl(thumbPath, 3600);
          if (data?.signedUrl) urls[e.id] = data.signedUrl;
        })
    );
    setThumbUrls(urls);
  }, []);

  async function fetchEntries() {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*, daily_intentions(*)')
      .order('recorded_at', { ascending: false })
      .limit(60);
    if (!error && data) {
      setEntries(data as unknown as JournalEntry[]);
      void loadThumbnails(data as unknown as JournalEntry[]);
    }
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { void fetchEntries(); }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.heading}>Journal</Text>
        {!loading && <Text style={styles.count}>{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</Text>}
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.accent.terracotta} style={{ marginTop: 40 }} />
      ) : entries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyHeadline}>Nothing here yet.</Text>
          <Text style={styles.emptyBody}>Record your first entry and it will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          numColumns={GRID_COLUMNS}
          renderItem={({ item }) => <GridCell entry={item} thumbUrl={thumbUrls[item.id] ?? null} />}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void fetchEntries(); }} tintColor={Colors.accent.terracotta} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 2,
  },
  heading: { fontSize: 32, fontWeight: '300', color: Colors.text.primary, fontFamily: 'Georgia', letterSpacing: 0.5 },
  count: { fontSize: 13, color: Colors.text.muted },
  grid: {},
  row: { gap: 2 },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    backgroundColor: Colors.surfaceDeep,
    marginBottom: 2,
    overflow: 'hidden',
  },
  cellImage: { width: '100%', height: '100%' },
  cellPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.surfaceDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.text.muted,
    opacity: 0.4,
  },
  cellOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15,13,9,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  cellSentiment: { fontSize: 9, color: 'rgba(255,255,255,0.75)', letterSpacing: 0.2, marginBottom: 1 },
  cellDate: { fontSize: 10, color: '#fff', fontWeight: '600', letterSpacing: 0.2 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 32 },
  emptyHeadline: { fontSize: 22, fontWeight: '300', color: Colors.text.primary, fontFamily: 'Georgia' },
  emptyBody: { fontSize: 14, color: Colors.text.muted, textAlign: 'center', lineHeight: 22 },
});
