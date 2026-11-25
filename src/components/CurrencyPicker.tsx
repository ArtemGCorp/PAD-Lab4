import React, { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../theme';

interface Props {
  label: string;
  value: string;
  options: string[];
  names?: Record<string, string>;
  onChange: (code: string) => void;
  testID?: string;
}

export function CurrencyPicker({ label, value, options, names, onChange, testID }: Props) {
  const [open, setOpen] = useState(false);
  const disabled = options.length === 0;
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        testID={testID}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[styles.button, disabled && { opacity: 0.5 }]}
      >
        <View>
          <Text style={styles.code}>{value || '—'}</Text>
          {names?.[value] ? <Text style={styles.name} numberOfLines={1}>{names[value]}</Text> : null}
        </View>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>{label}</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={12}>
              <Text style={styles.close}>Закрыть</Text>
            </Pressable>
          </View>
          <FlatList
            data={options}
            keyExtractor={(c) => c}
            renderItem={({ item }) => (
              <Pressable
                testID={`option-${item}`}
                style={[styles.row, item === value && styles.rowActive]}
                onPress={() => {
                  onChange(item);
                  setOpen(false);
                }}
              >
                <Text style={styles.rowCode}>{item}</Text>
                <Text style={styles.rowName}>{names?.[item] ?? ''}</Text>
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  label: { color: colors.muted, fontSize: 13, marginBottom: 6 },
  button: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.bg,
    minHeight: 56,
  },
  code: { fontSize: 18, fontWeight: '700', color: colors.text },
  name: { fontSize: 12, color: colors.muted, maxWidth: 110 },
  chevron: { color: colors.muted, fontSize: 16 },
  modal: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '600', color: colors.text },
  close: { color: colors.primary, fontSize: 16 },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  rowActive: { backgroundColor: colors.primarySoft },
  rowCode: { width: 56, fontWeight: '600', color: colors.text, fontSize: 16 },
  rowName: { color: colors.muted, fontSize: 15, flex: 1 },
});
