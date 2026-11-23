import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

export function Notice({ text, kind = 'warn' }: { text?: string | null; kind?: 'warn' | 'error' }) {
  if (!text) return null;
  return (
    <View style={[styles.box, kind === 'error' && styles.error]} accessibilityRole="alert">
      <Text style={[styles.text, kind === 'error' && { color: colors.errorText }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.warnBg, borderRadius: 10, padding: 12, marginBottom: 12 },
  error: { backgroundColor: '#FFE8E8' },
  text: { color: colors.warnText, fontSize: 14, lineHeight: 20 },
});
