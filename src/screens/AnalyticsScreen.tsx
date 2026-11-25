import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LineChart } from '../components/LineChart';
import { Notice } from '../components/Notice';
import { ScreenHeader } from '../components/ScreenHeader';
import { SOURCE_NAME } from '../lib/bnm';
import { formatAmount } from '../lib/money';
import { HistoryResult } from '../lib/repository';
import { seriesFor } from '../lib/series';
import { computeStats, Trend, TREND_LABEL } from '../lib/stats';
import { useAppState } from '../state';
import { card, colors } from '../theme';

const TREND_ICON: Record<Trend, string> = { up: '▲', down: '▼', flat: '■' };
const TREND_SOFT: Record<Trend, string> = { up: colors.upSoft, down: colors.downSoft, flat: colors.flatSoft };

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
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={loading && !!history} onRefresh={load} />}
    >
      <ScreenHeader title={title} subtitle={`Курс ${from} → ${to} за последние ${days} дней`} />
      <View style={styles.content}>
        {loading && !history ? (
          <View style={[card, styles.loading]}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.muted} testID="progress">Загрузка курсов {progress}</Text>
          </View>
        ) : from === to ? (
          <Notice text="Выберите на экране «Конвертер» две разные валюты." />
        ) : !stats ? (
          <>
            <Notice text={notice} />
            <Notice text={error} kind="error" />
            <View style={card}><Text style={styles.muted} testID="no-data">Нет данных за выбранный период.</Text></View>
          </>
        ) : (
          <>
            <View style={card}>
              <View style={styles.trendRow}>
                <View>
                  <Text style={styles.muted}>Сейчас</Text>
                  <Text style={styles.current} testID="current">{formatAmount(stats.last.value, 4)}</Text>
                </View>
                <View style={[styles.trendPill, { backgroundColor: TREND_SOFT[stats.trend] }]} testID="trend">
                  <Text style={[styles.trendText, { color: trendColor }]}>
                    {TREND_ICON[stats.trend]} {TREND_LABEL[stats.trend]}
                  </Text>
                  <Text style={[styles.trendPct, { color: trendColor }]} testID="pct">
                    {sign(stats.pctChange)}{formatAmount(Math.abs(stats.pctChange), 2)} %
                  </Text>
                </View>
              </View>
              <LineChart points={points} color={trendColor} />
            </View>

            <Notice text={notice} />
            <Notice text={error} kind="error" />

            <View style={styles.grid}>
              <Stat id="min" label="Минимум" value={formatAmount(stats.min.value, 4)} hint={stats.min.date} accent={colors.down} />
              <Stat id="max" label="Максимум" value={formatAmount(stats.max.value, 4)} hint={stats.max.date} accent={colors.up} />
              <Stat id="avg" label="Среднее" value={formatAmount(stats.avg, 4)} hint={`${stats.count} дн.`} accent={colors.primary} />
              <Stat id="change" label="Изменение"
                value={`${sign(stats.absChange)}${formatAmount(Math.abs(stats.absChange), 4)}`}
                hint={`${stats.first.date} → ${stats.last.date}`} accent={trendColor} />
            </View>

            <Text style={styles.source} testID="analytics-source">
              1 {from} в {to}. Источник: {SOURCE_NAME}. Данные на {lastDate}.
            </Text>
          </>
        )}
      </View>
    </ScrollView>
  );
}

function Stat({ id, label, value, hint, accent }: { id: string; label: string; value: string; hint: string; accent: string }) {
  return (
    <View style={[card, styles.stat]} testID={`stat-${id}`}>
      <View style={[styles.statBar, { backgroundColor: accent }]} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statHint}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 24 },
  content: { paddingHorizontal: 16, marginTop: -20, gap: 12 },
  loading: { alignItems: 'center', padding: 32, gap: 8 },
  muted: { color: colors.muted, fontSize: 13 },
  trendRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  current: { fontSize: 26, fontWeight: '800', color: colors.text },
  trendPill: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'flex-end' },
  trendText: { fontSize: 14, fontWeight: '700' },
  trendPct: { fontSize: 18, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stat: { flexBasis: '47%', flexGrow: 1, paddingLeft: 20, overflow: 'hidden' },
  statBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  statLabel: { color: colors.muted, fontSize: 13 },
  statValue: { color: colors.text, fontSize: 19, fontWeight: '700', marginTop: 2 },
  statHint: { color: colors.muted, fontSize: 12, marginTop: 2 },
  source: { color: colors.muted, fontSize: 12, textAlign: 'center' },
});
