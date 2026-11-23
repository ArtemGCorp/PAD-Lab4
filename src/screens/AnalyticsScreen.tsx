import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LineChart } from '../components/LineChart';
import { Notice } from '../components/Notice';
import { SOURCE_NAME } from '../lib/bnm';
import { formatAmount } from '../lib/money';
import { HistoryResult } from '../lib/repository';
import { seriesFor } from '../lib/series';
import { computeStats, TREND_LABEL } from '../lib/stats';
import { useAppState } from '../state';
import { card, colors } from '../theme';

export function AnalyticsScreen({ days, title }: { days: number; title: string }) {
  const { repo, from, to } = useAppState();
  const [history, setHistory] = useState<HistoryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    repo
      .getHistory(days, (done, total) => setProgress(`${done} / ${total}`))
      .then(setHistory)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [repo, days]);

  useEffect(load, [load]);

  const points = history ? seriesFor(history, from, to) : [];
  const stats = computeStats(points);
  const trendColor = stats ? colors[stats.trend] : colors.muted;
  const sign = (v: number) => (v > 0 ? '+' : v < 0 ? '−' : '');
  const lastDate = points.length ? points[points.length - 1].date : null;

  let notice: string | null = null;
  if (history?.offline) {
    notice = lastDate
      ? `Нет соединения с bnm.md. Показаны сохранённые данные, актуальные на ${lastDate}.`
      : 'Нет соединения с bnm.md и нет сохранённых данных за этот период.';
  } else if (history && history.missing > 0 && points.length > 0) {
    notice = `Нет данных за ${history.missing} из ${days} дней.`;
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading && !!history} onRefresh={load} />}
    >
      <Text style={styles.h1}>{title}</Text>
      <Text style={styles.pair}>{from} → {to}</Text>

      <Notice text={notice} />
      <Notice text={error} kind="error" />

      {loading && !history ? (
        <View style={styles.loading}>
          <ActivityIndicator />
          <Text style={styles.muted}>Загрузка курсов {progress}</Text>
        </View>
      ) : from === to ? (
        <Notice text="Выберите на экране «Конвертер» две разные валюты." />
      ) : !stats ? (
        <View style={card}><Text style={styles.muted}>Нет данных за выбранный период.</Text></View>
      ) : (
        <>
          <View style={card}>
            <View style={styles.trendRow}>
              <Text style={[styles.trend, { color: trendColor }]}>
                {stats.trend === 'up' ? '▲' : stats.trend === 'down' ? '▼' : '■'} {TREND_LABEL[stats.trend]}
              </Text>
              <Text style={[styles.pct, { color: trendColor }]}>
                {sign(stats.pctChange)}{formatAmount(Math.abs(stats.pctChange), 2)} %
              </Text>
            </View>
            <LineChart points={points} color={trendColor} />
          </View>

          <View style={[card, styles.grid]}>
            <Stat label="Минимум" value={formatAmount(stats.min.value, 4)} hint={stats.min.date} />
            <Stat label="Максимум" value={formatAmount(stats.max.value, 4)} hint={stats.max.date} />
            <Stat label="Среднее" value={formatAmount(stats.avg, 4)} hint={`${stats.count} дн.`} />
            <Stat label="Изменение" value={`${sign(stats.absChange)}${formatAmount(Math.abs(stats.absChange), 4)}`}
              hint={`${stats.first.date} → ${stats.last.date}`} />
          </View>

          <Text style={styles.source}>
            1 {from} в {to}. Источник: {SOURCE_NAME}. Данные на {lastDate}.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statHint}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  h1: { fontSize: 22, fontWeight: '700', color: colors.text },
  pair: { fontSize: 16, color: colors.muted, marginTop: -8 },
  loading: { alignItems: 'center', padding: 32, gap: 8 },
  muted: { color: colors.muted },
  trendRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  trend: { fontSize: 18, fontWeight: '700' },
  pct: { fontSize: 18, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 },
  stat: { width: '50%' },
  statLabel: { color: colors.muted, fontSize: 13 },
  statValue: { color: colors.text, fontSize: 18, fontWeight: '600', marginTop: 2 },
  statHint: { color: colors.muted, fontSize: 12, marginTop: 2 },
  source: { color: colors.muted, fontSize: 12, textAlign: 'center' },
});
