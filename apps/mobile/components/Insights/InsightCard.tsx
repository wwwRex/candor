import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import type { InsightSession } from '@repo/shared';

interface Props {
  session: InsightSession;
  isLatest?: boolean;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function InsightCard({ session, isLatest = false }: Props) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={[styles.card, isLatest && styles.latestCard]}
      onPress={() => router.push(`/insights/${session.id}`)}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <Text style={styles.date}>{formatDate(session.generated_at)}</Text>
        {session.audio_url && (
          <Text style={styles.audioTag}>🎧 Listen</Text>
        )}
      </View>

      <Text style={styles.preview} numberOfLines={isLatest ? 4 : 2}>
        {session.advice_text}
      </Text>

      <Text style={styles.meta}>
        {session.entry_count} {session.entry_count === 1 ? 'entry' : 'entries'} analyzed
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  latestCard: {
    borderColor: `${Colors.accent.amber}55`,
    marginBottom: 16,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 13, fontWeight: '600', color: Colors.accent.amber },
  audioTag: { fontSize: 13, color: Colors.text.secondary },
  preview: { fontSize: 15, color: Colors.text.primary, lineHeight: 23 },
  meta: { fontSize: 12, color: Colors.text.muted },
});
