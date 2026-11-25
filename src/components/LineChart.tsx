import React, { useState } from 'react';
import { LayoutChangeEvent, Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { formatShort, parseDay } from '../lib/dates';
import { formatAmount } from '../lib/money';
import { Point } from '../lib/stats';
import { colors } from '../theme';

interface Props {
  points: Point[];
  color: string;
  height?: number;
  digits?: number;
}

const PAD = { left: 8, right: 8, top: 22, bottom: 42 };
// SVG text defaults to a serif font in browsers.
const FONT = Platform.select({ web: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', default: undefined });

export function LineChart({ points, color, height = 230, digits = 4 }: Props) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  if (points.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>Нет данных для графика</Text>
      </View>
    );
  }

  const values = points.map((p) => p.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= Math.abs(min) * 0.001 || 1;
    max += Math.abs(max) * 0.001 || 1;
  }
  const w = Math.max(width - PAD.left - PAD.right, 1);
  const h = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length === 1 ? w / 2 : (i / (points.length - 1)) * w);
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * h;

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.value)}`).join(' ');
  const area = `${line} L${x(points.length - 1)},${PAD.top + h} L${x(0)},${PAD.top + h} Z`;
  const iMin = values.indexOf(Math.min(...values));
  const iMax = values.indexOf(Math.max(...values));
  const label = (d: string) => {
    const date = parseDay(d);
    return date ? formatShort(date) : d;
  };
  const anchor = (i: number) => (x(i) < 40 ? 'start' : x(i) > width - 40 ? 'end' : 'middle');
  const last = points.length - 1;

  return (
    <View onLayout={onLayout} style={{ height }} accessibilityLabel="График изменения курса" testID="chart">
      {width > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.25} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {[0, 0.5, 1].map((f) => (
            <Line key={f} x1={PAD.left} x2={PAD.left + w} y1={PAD.top + f * h} y2={PAD.top + f * h}
              stroke={colors.border} strokeWidth={1} strokeDasharray={f === 1 ? undefined : '4 4'} />
          ))}
          <Path d={area} fill="url(#area)" />
          <Path d={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          {points.length <= 10 && points.map((p, i) => (
            <Circle key={p.date} cx={x(i)} cy={y(p.value)} r={3} fill={colors.card} stroke={color} strokeWidth={2} />
          ))}
          <Circle cx={x(last)} cy={y(values[last])} r={5} fill={color} stroke={colors.card} strokeWidth={2} />
          <SvgText fontFamily={FONT} x={x(iMax)} y={y(values[iMax]) - 8} fontSize={11} fontWeight="600" fill={colors.text} textAnchor={anchor(iMax)}>
            {formatAmount(values[iMax], digits)}
          </SvgText>
          <SvgText fontFamily={FONT} x={x(iMin)} y={y(values[iMin]) + 16} fontSize={11} fontWeight="600" fill={colors.text} textAnchor={anchor(iMin)}>
            {iMin !== iMax ? formatAmount(values[iMin], digits) : ''}
          </SvgText>
          <SvgText fontFamily={FONT} x={PAD.left} y={height - 4} fontSize={11} fill={colors.muted} textAnchor="start">
            {label(points[0].date)}
          </SvgText>
          <SvgText fontFamily={FONT} x={PAD.left + w} y={height - 4} fontSize={11} fill={colors.muted} textAnchor="end">
            {label(points[last].date)}
          </SvgText>
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.muted },
});
