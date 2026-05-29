import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import type { JournalEntry } from '@repo/shared';

interface Props { entry: JournalEntry; }

function formatDate(iso: string) {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString('en-US', { weekday: 'long' }),
    date: d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  };
}

function formatDuration(s: number | null): string {
  if (!s) return '';
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

export function EntryCard({ entry }: Props) {
  const router = useRouter();
  const { day, date, time } = formatDate(entry.recorded_at);
  const intentions = entry.daily_intentions ?? [];
  const completed = intentions.filter((i) => i.completed).length;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/journal/${entry.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.dateRow}>
        <View>
          <Text style={styles.day}>{day}</Text>
          <Text style={styles.date}>{date} · {time}</Text>
        </View>
        {entry.duration_seconds ? (
          <Text style={styles.duration}>{formatDuration(entry.duration_seconds)}</Text>
        ) : null}
      </View>

      {entry.sentiment_summary && (
        <Text style={styles.sentiment}>{entry.sentiment_summary}</Text>
      )}

      {entry.transcript && (
        <Text style={styles.excerpt} numberOfLines={3}>{entry.transcript}</Text>
      )}

      {intentions.length > 0 && (
        <View style={styles.intentionsRow}>
          <View style={[styles.intentionDot, { backgroundColor: completed === intentions.length ? Colors.accent.sage : Colors.border }]} />
          <Text style={styles.intentionsText}>{completed}/{intentions.length} intentions</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  day: { fontSize: 16, fontWeight: '400', color: Colors.text.primary, fontFamily: 'Georgia' },
  date: { fontSize: 12, color: Colors.text.muted, marginTop: 2, letterSpacing: 0.2 },
  duration: { fontSize: 12, color: Colors.text.muted },
  sentiment: { fontSize: 13, color: Colors.accent.terracotta, fontStyle: 'italic' },
  excerpt: { fontSize: 15, color: Colors.text.secondary, lineHeight: 23, fontWeight: '300' },
  intentionsRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  intentionDot: { width: 6, height: 6, borderRadius: 3 },
  intentionsText: { fontSize: 12, color: Colors.text.muted },
});
