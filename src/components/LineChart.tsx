import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { parseDay, formatShort } from '../lib/dates';
import { Point } from '../lib/stats';
import { colors } from '../theme';

interface Props {
  points: Point[];
  color: string;
  height?: number;
  digits?: number;
}

const PAD = { left: 8, right: 8, top: 18, bottom: 22 };

export function LineChart({ points, color, height = 200, digits = 4 }: Props) {
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
    // flat line: give it some room
    min -= Math.abs(min) * 0.001 || 1;
    max += Math.abs(max) * 0.001 || 1;
  }
  const w = Math.max(width - PAD.left - PAD.right, 1);
  const h = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length === 1 ? w / 2 : (i / (points.length - 1)) * w);
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * h;

  const poly = points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ');
  const iMin = values.indexOf(Math.min(...values));
  const iMax = values.indexOf(Math.max(...values));
  const label = (d: string) => {
    const date = parseDay(d);
    return date ? formatShort(date) : d;
  };
  const anchor = (i: number) => (x(i) < 40 ? 'start' : x(i) > width - 40 ? 'end' : 'middle');

  return (
    <View onLayout={onLayout} style={{ height }} accessibilityLabel="График изменения курса">
      {width > 0 && (
        <Svg width={width} height={height}>
          {[0, 0.5, 1].map((f) => (
            <Line key={f} x1={PAD.left} x2={PAD.left + w} y1={PAD.top + f * h} y2={PAD.top + f * h}
              stroke={colors.border} strokeWidth={1} />
          ))}
          <Polyline points={poly} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
          {points.length <= 31 && points.map((p, i) => (
            <Circle key={p.date} cx={x(i)} cy={y(p.value)} r={points.length > 10 ? 1.8 : 3} fill={color} />
          ))}
          <SvgText x={x(iMax)} y={y(values[iMax]) - 6} fontSize={11} fill={colors.text} textAnchor={anchor(iMax)}>
            {values[iMax].toFixed(digits)}
          </SvgText>
          <SvgText x={x(iMin)} y={y(values[iMin]) + 14} fontSize={11} fill={colors.text} textAnchor={anchor(iMin)}>
            {iMin !== iMax ? values[iMin].toFixed(digits) : ''}
          </SvgText>
          <SvgText x={PAD.left} y={height - 4} fontSize={11} fill={colors.muted} textAnchor="start">
            {label(points[0].date)}
          </SvgText>
          <SvgText x={PAD.left + w} y={height - 4} fontSize={11} fill={colors.muted} textAnchor="end">
            {label(points[points.length - 1].date)}
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
