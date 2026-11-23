import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';

import { CurrencyPicker } from '../components/CurrencyPicker';
import { Notice } from '../components/Notice';
import { SOURCE_NAME } from '../lib/bnm';
import { convert, formatAmount, pairRate, parseAmount } from '../lib/money';
import { useAppState } from '../state';
import { card, colors } from '../theme';

export function ConverterScreen() {
  const s = useAppState();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ text: string; rate: string } | null>(null);

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
      text: `${formatAmount(parsed.value)} ${from} = ${formatAmount(value)} ${to}`,
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
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={s.loadingLatest && !!s.latest} onRefresh={s.reloadLatest} />}
    >
      <Notice text={s.latest?.notice} />
      <Notice text={s.latestError} kind="error" />

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
          keyboardType="decimal-pad"
          style={[styles.input, error && { borderColor: colors.errorText }]}
          returnKeyType="done"
          onSubmitEditing={() => canConvert && doConvert()}
        />
        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.pickers}>
          <CurrencyPicker label="Из валюты" value={s.from} options={s.currencies} names={names}
            onChange={(c) => { s.setFrom(c); setResult(null); }} />
          <Pressable onPress={onSwap} style={styles.swap} accessibilityLabel="Поменять валюты местами" hitSlop={8}>
            <Text style={styles.swapText}>⇄</Text>
          </Pressable>
          <CurrencyPicker label="В валюту" value={s.to} options={s.currencies} names={names}
            onChange={(c) => { s.setTo(c); setResult(null); }} />
        </View>

        <Pressable
          testID="convert"
          disabled={!canConvert}
          onPress={() => doConvert()}
          style={[styles.button, !canConvert && { backgroundColor: colors.disabled }]}
        >
          <Text style={styles.buttonText}>Конвертировать</Text>
        </Pressable>
      </View>

      {result && (
        <View style={[card, styles.resultCard]}>
          <Text style={styles.result}>{result.text}</Text>
          <Text style={styles.rate}>{result.rate}</Text>
        </View>
      )}

      <View style={styles.info}>
        {s.loadingLatest && !s.latest ? (
          <ActivityIndicator />
        ) : table ? (
          <>
            <Text style={styles.infoText}>Курс на {table.date}</Text>
            <Text style={styles.infoText}>Источник: {SOURCE_NAME}</Text>
            {s.latest?.fromCache && s.latest.savedAt && (
              <Text style={styles.infoText}>
                Сохранено: {new Date(s.latest.savedAt).toLocaleString('ru-RU')}
              </Text>
            )}
          </>
        ) : (
          <Pressable onPress={s.reloadLatest} style={styles.retry}>
            <Text style={{ color: colors.primary }}>Повторить загрузку</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  label: { color: colors.muted, fontSize: 13, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 20, color: colors.text,
  },
  error: { color: colors.errorText, marginTop: 6 },
  pickers: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 16 },
  swap: { paddingHorizontal: 6, paddingBottom: 10 },
  swapText: { fontSize: 26, color: colors.primary },
  button: { marginTop: 18, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: colors.primaryText, fontSize: 17, fontWeight: '600' },
  resultCard: { marginTop: 16, alignItems: 'center' },
  result: { fontSize: 22, fontWeight: '700', color: colors.text, textAlign: 'center' },
  rate: { marginTop: 6, color: colors.muted },
  info: { marginTop: 16, alignItems: 'center', gap: 2 },
  infoText: { color: colors.muted, fontSize: 13 },
  retry: { padding: 8 },
});
