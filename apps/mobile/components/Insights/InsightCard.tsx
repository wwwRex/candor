import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import type { InsightSession } from '@repo/shared';

interface Props { session: InsightSession; isLatest?: boolean; }

function formatPeriod(start: string, end: string): string {
  const s = new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const e = new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${s} – ${e}`;
}

export function InsightCard({ session, isLatest = false }: Props) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={[styles.card, isLatest && styles.latestCard]}
      onPress={() => router.push(`/insights/${session.id}`)}
      activeOpacity={0.75}
    >
      {isLatest && (
        <Text style={styles.latestLabel}>Latest Reflection</Text>
      )}

      <Text style={styles.period}>{formatPeriod(session.period_start, session.period_end)}</Text>

      <Text style={styles.preview} numberOfLines={isLatest ? 5 : 2}>
        {session.advice_text}
      </Text>

      <View style={styles.footer}>
        <Text style={styles.meta}>{session.entry_count} {session.entry_count === 1 ? 'entry' : 'entries'} analyzed</Text>
        {session.audio_url && <Text style={styles.audioTag}>▶ Listen</Text>}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 22,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  latestCard: {
    backgroundColor: Colors.background,
    borderColor: Colors.accent.terracotta,
    borderWidth: 1,
  },
  latestLabel: {
    fontSize: 10,
    color: Colors.accent.terracotta,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    fontWeight: '600',
  },
  period: { fontSize: 13, color: Colors.text.muted, letterSpacing: 0.3 },
  preview: {
    fontSize: 16,
    color: Colors.text.primary,
    lineHeight: 26,
    fontWeight: '300',
    fontFamily: 'Georgia',
  },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { fontSize: 12, color: Colors.text.muted },
  audioTag: { fontSize: 13, color: Colors.accent.sage, fontWeight: '500' },
});
