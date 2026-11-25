import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AnalyticsScreen } from './src/screens/AnalyticsScreen';
import { ConverterScreen } from './src/screens/ConverterScreen';
import { AppStateProvider } from './src/state';
import { colors } from './src/theme';

type Tab = 'convert' | 'week' | 'month';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'convert', label: 'Конвертер', icon: '⇄' },
  { key: 'week', label: 'Неделя', icon: '7' },
  { key: 'month', label: 'Месяц', icon: '30' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('convert');
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <SafeAreaView style={styles.root} edges={['top']}>
          <StatusBar style="light" />
          <View style={styles.body}>
            {tab === 'convert' && <ConverterScreen />}
            {tab === 'week' && <AnalyticsScreen key="week" days={7} title="Сравнение за неделю" />}
            {tab === 'month' && <AnalyticsScreen key="month" days={30} title="Сравнение за месяц" />}
          </View>
        </SafeAreaView>
        <SafeAreaView edges={['bottom']} style={styles.tabsWrap}>
          <View style={styles.tabs} accessibilityRole="tablist">
            {TABS.map((t) => {
              const active = t.key === tab;
              return (
                <Pressable key={t.key} style={styles.tab} onPress={() => setTab(t.key)} testID={`tab-${t.key}`}
                  accessibilityRole="tab" accessibilityState={{ selected: active }}>
                  <View style={[styles.pill, active && styles.pillActive]}>
                    <Text style={[styles.icon, active && styles.active]}>{t.icon}</Text>
                  </View>
                  <Text style={[styles.tabLabel, active && styles.active]}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </SafeAreaView>
      </AppStateProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.header },
  body: { flex: 1, backgroundColor: colors.bg },
  tabsWrap: { backgroundColor: colors.card },
  tabs: {
    flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
    backgroundColor: colors.card, paddingTop: 6, paddingBottom: 4,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  pill: { minWidth: 56, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  pillActive: { backgroundColor: colors.primarySoft },
  icon: { fontSize: 16, fontWeight: '800', color: colors.muted },
  tabLabel: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  active: { color: colors.primary },
});
