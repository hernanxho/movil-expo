import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg';

import type { Satellite } from '../../domain/gnss/constellation';
import type { SatelliteReading } from '../../domain/gnss/receiver';
import { colors } from '../theme';

type Props = {
  sky: Satellite[];
  readings: SatelliteReading[];
  /** Elevación mínima con línea de vista en el entorno actual (se dibuja como "edificios"). */
  maskDeg: number | null;
};

/**
 * Vista del cielo (sky plot): el centro es el cenit y el borde el horizonte.
 * El azimut indica la dirección (norte arriba) y la distancia al centro, la elevación.
 */
export function SkyPlot({ sky, readings, maskDeg }: Props) {
  const [width, setWidth] = useState(0);
  const size = Math.min(width, 320);
  const c = size / 2;
  const R = c - 30;
  const toXY = (az: number, el: number) => {
    const r = ((90 - el) / 90) * R;
    const a = (az * Math.PI) / 180;
    return { x: c + r * Math.sin(a), y: c - r * Math.cos(a) };
  };
  const byPrn = new Map(readings.map((r) => [r.prn, r]));

  return (
    <View style={{ alignItems: 'center' }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {size > 0 ? (
        <Svg width={size} height={size}>
          {maskDeg !== null ? (
            <Circle cx={c} cy={c} r={R} fill="rgba(242,107,91,0.12)" />
          ) : null}
          {maskDeg !== null ? (
            <Circle cx={c} cy={c} r={((90 - maskDeg) / 90) * R} fill={colors.card} stroke={colors.red} strokeDasharray="3 4" />
          ) : null}
          {[0, 30, 60].map((el) => (
            <Circle key={el} cx={c} cy={c} r={((90 - el) / 90) * R} fill="none" stroke={colors.line} strokeWidth={1} />
          ))}
          <Line x1={c} x2={c} y1={c - R} y2={c + R} stroke={colors.line} />
          <Line x1={c - R} x2={c + R} y1={c} y2={c} stroke={colors.line} />
          {(
            [
              ['N', 0],
              ['E', 90],
              ['S', 180],
              ['O', 270],
            ] as const
          ).map(([label, az]) => {
            const a = (az * Math.PI) / 180;
            const p = { x: c + (R + 16) * Math.sin(a), y: c - (R + 16) * Math.cos(a) };
            return (
              <SvgText key={label} x={p.x} y={p.y + 4} fill={colors.muted} fontSize={12} textAnchor="middle">
                {label}
              </SvgText>
            );
          })}
          {[30, 60].map((el) => (
            <SvgText key={`l${el}`} x={c + 3} y={c - ((90 - el) / 90) * R + 11} fill={colors.faint} fontSize={9}>
              {el}°
            </SvgText>
          ))}

          {sky.map((s) => {
            const p = toXY(s.azimuthDeg, s.elevationDeg);
            const reading = byPrn.get(s.prn);
            const state = !reading ? 'blocked' : reading.used ? 'used' : 'excluded';
            const fill =
              state === 'used' ? (reading!.multipathM > 0 ? colors.amber : colors.teal) : 'transparent';
            const stroke = state === 'blocked' ? colors.faint : state === 'used' ? fill : colors.muted;
            return (
              <G key={s.prn}>
                {state === 'used' ? <Line x1={c} y1={c} x2={p.x} y2={p.y} stroke={fill} strokeOpacity={0.35} /> : null}
                <Circle cx={p.x} cy={p.y} r={11} fill={fill} stroke={stroke} strokeWidth={1.5} />
                <SvgText
                  x={p.x}
                  y={p.y + 4}
                  fill={state === 'used' ? colors.background : stroke}
                  fontSize={10}
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {s.prn}
                </SvgText>
              </G>
            );
          })}
          <Circle cx={c} cy={c} r={4} fill={colors.blue} />
        </Svg>
      ) : null}
    </View>
  );
}
