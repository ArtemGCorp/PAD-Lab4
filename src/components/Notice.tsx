import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

export function Notice({ text, kind = 'warn' }: { text?: string | null; kind?: 'warn' | 'error' }) {
  if (!text) return null;
  const error = kind === 'error';
  return (
    <View style={[styles.box, error && styles.error]} accessibilityRole="alert" testID={error ? 'error' : 'notice'}>
      <Text style={[styles.icon, error && { color: colors.errorText }]}>{error ? '⨯' : '!'}</Text>
      <Text style={[styles.text, error && { color: colors.errorText }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: colors.warnBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  error: { backgroundColor: colors.errorBg },
  icon: { color: colors.warnText, fontWeight: '800', fontSize: 15, width: 14, textAlign: 'center' },
  text: { color: colors.warnText, fontSize: 14, lineHeight: 20, flex: 1 },
});
