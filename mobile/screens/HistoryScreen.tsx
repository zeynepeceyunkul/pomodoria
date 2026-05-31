import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii } from '../constants/theme';
import { Card } from '../components/Card';
import { useTabContentPadding } from '../hooks/useTabContentPadding';
import { formatMinutes } from '../lib/formatMinutes';
import { aggregateSessionRanges } from '../lib/sessionAggregate';
import { AuthHttpError } from '../services/http';
import { getMySessions, type SessionRecord } from '../services/sessions';
import { useAuth } from '../context/AuthContext';

function formatShort(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function HistoryScreen() {
  const { signOut } = useAuth();
  const bottomPad = useTabContentPadding(24);
  const [items, setItems] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const agg = useMemo(() => aggregateSessionRanges(items), [items]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await getMySessions();
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      if (e instanceof AuthHttpError && e.status === 401) {
        await signOut();
        return;
      }
      setError(e instanceof Error ? e.message : 'Could not load history.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [signOut]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const totalSessions = items.length;

  const header = (
    <View style={styles.headerBlock}>
      <Text style={styles.pageTitle}>History</Text>
      {loading ? <Text style={styles.muted}>Loading…</Text> : null}
      {error ? <Text style={styles.err}>{error}</Text> : null}

      <View style={styles.summaryRow}>
        <Card style={[styles.summaryCard, styles.summarySpacing]}>
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={styles.summaryValue}>{totalSessions}</Text>
          <Text style={styles.summarySub}>sessions logged</Text>
        </Card>
        <Card style={[styles.summaryCard, styles.summarySpacing]}>
          <Text style={styles.summaryLabel}>This week</Text>
          <Text style={styles.summaryValue}>{agg.weekSessions}</Text>
          <Text style={styles.summarySub}>{formatMinutes(agg.weekMinutes)} focus</Text>
        </Card>
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Today</Text>
          <Text style={styles.summaryValue}>{agg.todaySessions}</Text>
          <Text style={styles.summarySub}>{formatMinutes(agg.todayMinutes)} focus</Text>
        </Card>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={header}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPad }]}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={
          <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>No sessions yet. Finish a focus round to see it here.</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.type}>
                {item.type === 'focus' ? 'Focus' : 'Break'} · {item.duration} min
              </Text>
              <Text style={styles.time}>{formatShort(item.startTime)}</Text>
            </View>
            <View style={[styles.badge, styles.rowGap]}>
              <Text style={styles.badgeText}>{item.completed ? 'Done' : 'Open'}</Text>
            </View>
            <Text style={[styles.xp, styles.rowGap]}>+{item.xpEarned} XP</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  headerBlock: {
    paddingBottom: 8,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
    marginTop: 4,
  },
  muted: { color: colors.textMuted, marginBottom: 8 },
  err: { color: colors.errorText, marginBottom: 8 },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  summaryCard: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 8,
  },
  summarySpacing: {
    marginRight: 8,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  summarySub: {
    marginTop: 2,
    fontSize: 11,
    color: colors.textSoft,
  },
  list: { paddingHorizontal: 18, paddingTop: 0 },
  empty: { color: colors.textMuted, marginTop: 24, textAlign: 'center', paddingHorizontal: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.card - 2,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.miniBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  type: { fontSize: 15, fontWeight: '700', color: colors.text },
  time: { marginTop: 4, fontSize: 13, color: colors.textSoft },
  rowGap: { marginLeft: 10 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.miniBg,
    borderWidth: 1,
    borderColor: colors.miniBorder,
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  xp: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
});
