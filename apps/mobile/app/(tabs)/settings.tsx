import { useEffect, useState } from 'react';
import { View, Text, Switch, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { scheduleDailyReminder, cancelDailyReminder } from '../../lib/notifications';
import { Colors } from '../../constants/colors';
import type { AdviceFrequency, RecordingMode, User } from '@repo/shared';

const FREQUENCY_OPTIONS: { label: string; value: AdviceFrequency }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Every 2 Days', value: 'every_2_days' },
  { label: 'Weekly', value: 'weekly' },
];

const MODE_OPTIONS: { label: string; value: RecordingMode; desc: string }[] = [
  { label: 'Guided', value: 'guided', desc: 'Get a daily prompt before recording' },
  { label: 'Quick', value: 'quick', desc: 'Tap once and start recording' },
];

export default function SettingsTab() {
  const [user, setUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);

  async function fetchUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/users/me`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) setUser(await res.json() as User);
  }

  async function updateUser(patch: Partial<User>) {
    if (!user) return;
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/users/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(patch),
    });
    if (res.ok) setUser({ ...user, ...patch });
    setSaving(false);
  }

  async function handleReminderToggle(enabled: boolean) {
    await updateUser({ reminder_enabled: enabled });
    if (enabled) {
      await scheduleDailyReminder(21, 0); // 9:00 PM default
    } else {
      await cancelDailyReminder();
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  useEffect(() => { void fetchUser(); }, []);

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Settings</Text>

        {/* Recording Mode */}
        <Text style={styles.sectionTitle}>Recording Mode</Text>
        <View style={styles.card}>
          {MODE_OPTIONS.map((opt, i) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.optionRow, i < MODE_OPTIONS.length - 1 && styles.optionRowBorder]}
              onPress={() => updateUser({ recording_mode: opt.value })}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.optionLabel}>{opt.label}</Text>
                <Text style={styles.optionDesc}>{opt.desc}</Text>
              </View>
              {user.recording_mode === opt.value && (
                <View style={styles.selectedDot} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Advice Frequency */}
        <Text style={styles.sectionTitle}>Insight Frequency</Text>
        <View style={styles.card}>
          {FREQUENCY_OPTIONS.map((opt, i) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.optionRow, i < FREQUENCY_OPTIONS.length - 1 && styles.optionRowBorder]}
              onPress={() => updateUser({ advice_frequency: opt.value })}
            >
              <Text style={styles.optionLabel}>{opt.label}</Text>
              {user.advice_frequency === opt.value && <View style={styles.selectedDot} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Daily Reminder */}
        <Text style={styles.sectionTitle}>Daily Reminder</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <Text style={styles.optionLabel}>Remind me to record</Text>
            <Switch
              value={user.reminder_enabled}
              onValueChange={handleReminderToggle}
              trackColor={{ false: Colors.border, true: Colors.accent.amber }}
              thumbColor={Colors.text.primary}
            />
          </View>
          {user.reminder_enabled && (
            <Text style={styles.optionDesc}>You'll be reminded daily at 9:00 PM.</Text>
          )}
        </View>

        {/* Account */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <View style={styles.optionRow}>
            <Text style={styles.optionLabel}>{user.email}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  heading: { fontSize: 28, fontWeight: '600', color: Colors.text.primary, paddingTop: 8, paddingBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.text.muted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8, marginTop: 24 },
  card: { backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  optionRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  optionLabel: { fontSize: 16, color: Colors.text.primary, flex: 1 },
  optionDesc: { fontSize: 13, color: Colors.text.secondary, marginTop: 2 },
  selectedDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.accent.amber },
  switchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  signOutBtn: { marginTop: 32, paddingVertical: 16, alignItems: 'center', borderRadius: 14, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  signOutText: { color: Colors.danger, fontSize: 16, fontWeight: '500' },
});
