import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';

import { CurrencyPicker } from '../components/CurrencyPicker';
import { Notice } from '../components/Notice';
import { ScreenHeader } from '../components/ScreenHeader';
import { SOURCE_NAME } from '../lib/bnm';
import { convert, formatAmount, pairRate, parseAmount } from '../lib/money';
import { useAppState } from '../state';
import { card, colors } from '../theme';

export function ConverterScreen() {
  const s = useAppState();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ from: string; to: string; rate: string } | null>(null);

  const table = s.latest?.table;
  const names = useMemo(
    () => Object.fromEntries(Object.values(table?.rates ?? {}).map((r) => [r.code, r.name])),
    [table],
  );
  const canConvert = !!table && amount.trim() !== '' && !!s.from && !!s.to;

  const doConvert = (from = s.from, to = s.to) => {
    const parsed = parseAmount(amount);
    if (!parsed.ok) {
      setError(parsed.error);
      setResult(null);
      return;
    }
    if (!table) return;
    const value = convert(parsed.value, table, from, to);
    const rate = pairRate(table, from, to);
    if (value === null || rate === null) {
      setError('Нет курса для выбранной валюты');
      setResult(null);
      return;
    }
    setError(null);
    setResult({
      from: `${formatAmount(parsed.value)} ${from}`,
      to: `${formatAmount(value)} ${to}`,
      rate: `1 ${from} = ${formatAmount(rate, 4)} ${to}`,
    });
  };

  const onSwap = () => {
    const [f, t] = [s.to, s.from];
    s.swap();
    if (result && canConvert) doConvert(f, t);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={s.loadingLatest && !!s.latest} onRefresh={s.reloadLatest} />}
    >
      <ScreenHeader title="Конвертер валют" subtitle="Официальный курс Национального банка Молдовы" />
      <View style={styles.content}>
        <View style={card}>
          <Text style={styles.label}>Сумма</Text>
          <TextInput
            testID="amount"
            value={amount}
            onChangeText={(t) => {
              setAmount(t);
              setError(null);
            }}
            placeholder="Например, 100 или 12,50"
            placeholderTextColor={colors.disabled}
            keyboardType="decimal-pad"
            style={[styles.input, error ? styles.inputError : null]}
            returnKeyType="done"
            onSubmitEditing={() => canConvert && doConvert()}
          />
          {error && <Text style={styles.error} testID="amount-error">{error}</Text>}

          <View style={styles.pickers}>
            <CurrencyPicker label="Из валюты" value={s.from} options={s.currencies} names={names} testID="from"
              onChange={(c) => { s.setFrom(c); setResult(null); }} />
            <Pressable onPress={onSwap} style={styles.swap} accessibilityLabel="Поменять валюты местами"
              hitSlop={8} testID="swap">
              <Text style={styles.swapText}>⇄</Text>
            </Pressable>
            <CurrencyPicker label="В валюту" value={s.to} options={s.currencies} names={names} testID="to"
              onChange={(c) => { s.setTo(c); setResult(null); }} />
          </View>

          <Pressable
            testID="convert"
            accessibilityRole="button"
            accessibilityState={{ disabled: !canConvert }}
            disabled={!canConvert}
            onPress={() => doConvert()}
            style={({ pressed }) => [styles.button, !canConvert && styles.buttonDisabled, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.buttonText}>Конвертировать</Text>
          </Pressable>
        </View>

        <Notice text={s.latest?.notice} />
        <Notice text={s.latestError} kind="error" />

        {result && (
          <View style={[card, styles.resultCard]} testID="result">
            <Text style={styles.resultFrom}>{result.from} =</Text>
            <Text style={styles.resultTo} testID="result-value">{result.to}</Text>
            <View style={styles.rateChip}>
              <Text style={styles.rateText} testID="result-rate">{result.rate}</Text>
            </View>
          </View>
        )}

        <View style={[card, styles.info]}>
          {s.loadingLatest && !s.latest ? (
            <ActivityIndicator color={colors.primary} />
          ) : table ? (
            <>
              <Row label="Дата курса" value={table.date} testID="rate-date" />
              <Row label="Источник" value={SOURCE_NAME} testID="source" />
              {s.latest?.fromCache && s.latest.savedAt && (
                <Row label="Сохранено" value={new Date(s.latest.savedAt).toLocaleString('ru-RU')} testID="saved-at" />
              )}
            </>
          ) : (
            <Pressable onPress={s.reloadLatest} style={styles.retry} testID="retry">
              <Text style={{ color: colors.primary, fontWeight: '600' }}>Повторить загрузку</Text>
            </Pressable>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function Row({ label, value, testID }: { label: string; value: string; testID: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} testID={testID}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 24 },
  content: { paddingHorizontal: 16, marginTop: -20, gap: 12 },
  label: { color: colors.muted, fontSize: 13, marginBottom: 6, fontWeight: '600' },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 22, fontWeight: '600', color: colors.text, backgroundColor: colors.bg,
  },
  inputError: { borderColor: colors.errorText },
  error: { color: colors.errorText, marginTop: 6 },
  pickers: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 16 },
  swap: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  swapText: { fontSize: 20, color: colors.primary, fontWeight: '700' },
  button: { marginTop: 18, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  buttonDisabled: { backgroundColor: colors.disabled },
  buttonText: { color: colors.primaryText, fontSize: 17, fontWeight: '700' },
  resultCard: { alignItems: 'center', paddingVertical: 20 },
  resultFrom: { fontSize: 16, color: colors.muted },
  resultTo: { fontSize: 30, fontWeight: '800', color: colors.primary, marginTop: 4, textAlign: 'center' },
  rateChip: { marginTop: 10, backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  rateText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  info: { gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rowLabel: { color: colors.muted, fontSize: 13 },
  rowValue: { color: colors.text, fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  retry: { padding: 8, alignItems: 'center' },
});
