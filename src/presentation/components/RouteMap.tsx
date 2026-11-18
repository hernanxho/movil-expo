import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Polygon, Polyline, Text as SvgText } from 'react-native-svg';

import { type LatLon, toLocal } from '../../domain/geo/geo';
import type { Fix, Geofence } from '../../domain/tracking/entities';
import type { RejectedFix } from '../../domain/usecases/TrackingSession';
import { colors } from '../theme';

type Props = {
  track: Fix[];
  rejected: RejectedFix[];
  geofences: Geofence[];
  insideZones: string[];
  lastFix: Fix | null;
  /** Ruta prevista (solo en la simulación), dibujada tenue de fondo. */
  plannedRoute?: LatLon[];
  height?: number;
};

const PAD = 18;
const GRID_STEPS = [10, 20, 50, 100, 200, 500, 1000, 2000];

/** Mapa vectorial del recorrido en metros: no depende de servicios de mapas ni de claves de API. */
export function RouteMap({ track, rejected, geofences, insideZones, lastFix, plannedRoute = [], height = 320 }: Props) {
  const [width, setWidth] = useState(0);
  const origin = geofences[0]?.center ?? plannedRoute[0] ?? track[0] ?? lastFix;

  if (!origin) {
    return (
      <View style={[styles.empty, { height: 140 }]}>
        <Text style={styles.emptyText}>El recorrido aparecerá aquí cuando llegue la primera posición.</Text>
      </View>
    );
  }

  const L = (p: LatLon) => toLocal(origin, p);
  const xs: number[] = [];
  const ys: number[] = [];
  const include = (x: number, y: number) => {
    xs.push(x);
    ys.push(y);
  };
  plannedRoute.forEach((p) => {
    const l = L(p);
    include(l.x, l.y);
  });
  geofences.forEach((g) => {
    const c = L(g.center);
    include(c.x - g.radiusM, c.y - g.radiusM);
    include(c.x + g.radiusM, c.y + g.radiusM);
  });
  [...track, ...rejected, ...(lastFix ? [lastFix] : [])].forEach((p) => {
    const l = L(p);
    include(l.x, l.y);
  });

  let minX = Math.min(...xs);
  let maxX = Math.max(...xs);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);
  const minSpan = 80;
  if (maxX - minX < minSpan) {
    const c = (maxX + minX) / 2;
    minX = c - minSpan / 2;
    maxX = c + minSpan / 2;
  }
  if (maxY - minY < minSpan) {
    const c = (maxY + minY) / 2;
    minY = c - minSpan / 2;
    maxY = c + minSpan / 2;
  }

  const innerW = Math.max(1, width - PAD * 2);
  const innerH = height - PAD * 2;
  const k = Math.min(innerW / (maxX - minX), innerH / (maxY - minY));
  const offX = PAD + (innerW - (maxX - minX) * k) / 2;
  const offY = PAD + (innerH - (maxY - minY) * k) / 2;
  const sx = (x: number) => offX + (x - minX) * k;
  const sy = (y: number) => offY + (maxY - y) * k;
  const project = (p: LatLon) => {
    const l = L(p);
    return { x: sx(l.x), y: sy(l.y) };
  };

  const span = Math.max(maxX - minX, maxY - minY);
  const step = GRID_STEPS.find((s) => span / s <= 8) ?? 5000;
  const gridX: number[] = [];
  const gridY: number[] = [];
  for (let gx = Math.ceil((minX - 2 * step) / step) * step; gx <= maxX + 2 * step; gx += step) gridX.push(gx);
  for (let gy = Math.ceil((minY - 2 * step) / step) * step; gy <= maxY + 2 * step; gy += step) gridY.push(gy);

  const toPoints = (ps: LatLon[]) =>
    ps
      .map((p) => {
        const s = project(p);
        return `${s.x.toFixed(1)},${s.y.toFixed(1)}`;
      })
      .join(' ');

  const current = track[track.length - 1] ?? null;
  const cur = current ? project(current) : null;
  const heading = current?.headingDeg;

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          <G>
            {gridX.map((gx) => (
              <Line key={`x${gx}`} x1={sx(gx)} x2={sx(gx)} y1={0} y2={height} stroke={colors.line} strokeWidth={1} />
            ))}
            {gridY.map((gy) => (
              <Line key={`y${gy}`} x1={0} x2={width} y1={sy(gy)} y2={sy(gy)} stroke={colors.line} strokeWidth={1} />
            ))}
          </G>

          {geofences.map((g) => {
            const c = project(g.center);
            const inside = insideZones.includes(g.id);
            return (
              <G key={g.id}>
                <Circle
                  cx={c.x}
                  cy={c.y}
                  r={g.radiusM * k}
                  fill={inside ? 'rgba(180,155,255,0.22)' : 'rgba(180,155,255,0.07)'}
                  stroke={colors.violet}
                  strokeWidth={inside ? 2 : 1}
                  strokeDasharray={inside ? undefined : '4 4'}
                />
                <SvgText x={c.x} y={c.y - g.radiusM * k - 5} fill={colors.violet} fontSize={11} textAnchor="middle">
                  {g.name}
                </SvgText>
              </G>
            );
          })}

          {plannedRoute.length > 1 ? (
            <Polyline
              points={toPoints(plannedRoute)}
              fill="none"
              stroke={colors.faint}
              strokeWidth={2}
              strokeDasharray="2 6"
              strokeLinecap="round"
            />
          ) : null}

          {track.length > 1 ? (
            <Polyline
              points={toPoints(track)}
              fill="none"
              stroke={colors.teal}
              strokeWidth={3}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}

          {rejected.map((r, i) => {
            const p = project(r);
            const d = 4;
            return (
              <Path
                key={`r${i}`}
                d={`M${p.x - d},${p.y - d}L${p.x + d},${p.y + d}M${p.x + d},${p.y - d}L${p.x - d},${p.y + d}`}
                stroke={colors.red}
                strokeWidth={2}
              />
            );
          })}

          {cur && current ? (
            <G>
              {current.accuracyM ? (
                <Circle
                  cx={cur.x}
                  cy={cur.y}
                  r={Math.max(6, current.accuracyM * k)}
                  fill="rgba(110,168,254,0.18)"
                  stroke={colors.blue}
                  strokeWidth={1}
                />
              ) : null}
              {heading !== null && heading !== undefined ? (
                <G transform={`rotate(${heading.toFixed(1)}, ${cur.x.toFixed(1)}, ${cur.y.toFixed(1)})`}>
                  <Polygon
                    points={`${cur.x},${cur.y - 14} ${cur.x - 5},${cur.y - 4} ${cur.x + 5},${cur.y - 4}`}
                    fill={colors.blue}
                  />
                </G>
              ) : null}
              <Circle cx={cur.x} cy={cur.y} r={6} fill={colors.blue} stroke={colors.text} strokeWidth={2} />
            </G>
          ) : null}

          <G>
            <Line x1={PAD} x2={PAD + step * k} y1={height - 10} y2={height - 10} stroke={colors.muted} strokeWidth={2} />
            <SvgText x={PAD + step * k + 6} y={height - 6} fill={colors.muted} fontSize={10}>
              {step >= 1000 ? `${step / 1000} km` : `${step} m`}
            </SvgText>
            <SvgText x={width - PAD} y={PAD} fill={colors.muted} fontSize={11} textAnchor="end">
              N ↑
            </SvgText>
          </G>
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: colors.cardRaised,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
  },
});
