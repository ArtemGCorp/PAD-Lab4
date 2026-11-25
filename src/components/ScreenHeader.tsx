import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title} accessibilityRole="header" testID="screen-title">{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.header,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 34,
  },
  title: { color: colors.headerText, fontSize: 24, fontWeight: '700' },
  subtitle: { color: colors.headerMuted, fontSize: 14, marginTop: 4 },
});
