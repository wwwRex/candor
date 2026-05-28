import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import type { JournalEntry } from '@repo/shared';

interface Props {
  entry: JournalEntry;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function EntryCard({ entry }: Props) {
  const router = useRouter();
  const intentions = entry.daily_intentions ?? [];
  const completed = intentions.filter((i) => i.completed).length;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/journal/${entry.id}`)}
      activeOpacity={0.75}
    >
      <View style={styles.header}>
        <Text style={styles.date}>{formatDate(entry.recorded_at)}</Text>
        {entry.duration_seconds && (
          <Text style={styles.duration}>{formatDuration(entry.duration_seconds)}</Text>
        )}
      </View>

      {entry.sentiment_summary && (
        <View style={styles.sentimentBadge}>
          <Text style={styles.sentimentText}>{entry.sentiment_summary}</Text>
        </View>
      )}

      {entry.transcript && (
        <Text style={styles.excerpt} numberOfLines={2}>
          {entry.transcript}
        </Text>
      )}

      {intentions.length > 0 && (
        <Text style={styles.goals}>
          {completed}/{intentions.length} intentions completed
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 14, fontWeight: '600', color: Colors.text.primary },
  duration: { fontSize: 12, color: Colors.text.muted },
  sentimentBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${Colors.accent.amber}22`,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sentimentText: { fontSize: 12, color: Colors.accent.amber },
  excerpt: { fontSize: 14, color: Colors.text.secondary, lineHeight: 20 },
  goals: { fontSize: 12, color: Colors.text.muted },
});
