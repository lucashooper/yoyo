import React from 'react';
import Svg, { Circle, Ellipse, G, Rect } from 'react-native-svg';

const HEAD = '#5CBAD6';
const INK = '#1A1F2C';
const TONGUE = '#FFB8A8';
const BLUSH = '#FFB8A8';

interface NobiMascotSvgProps {
  size?: number;
  /** 0 = closed smile, 1 = wide open (voice session) */
  mouthOpen?: number;
}

/**
 * Single unified Nobi face — head, eyes, mouth, tongue in one SVG layer.
 * Avoids misaligned RN View cheeks that looked like pink artifacts.
 */
export function NobiMascotSvg({ size = 180, mouthOpen = 0.35 }: NobiMascotSvgProps) {
  const open = Math.max(0, Math.min(1, mouthOpen));
  const mouthH = 8 + open * 18;
  const mouthW = 34 + open * 10;
  const mouthX = 60 - mouthW / 2;
  const mouthY = 68 - (mouthH - 10) / 2;
  const tongueW = mouthW * 0.55;
  const tongueH = Math.max(6, mouthH * 0.55);

  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Circle cx={60} cy={60} r={56} fill={HEAD} stroke="rgba(0,0,0,0.06)" strokeWidth={1} />

      {/* Subtle blush — low on cheeks, not near eyes */}
      <Ellipse cx={34} cy={72} rx={9} ry={5} fill={BLUSH} opacity={0.35} />
      <Ellipse cx={86} cy={72} rx={9} ry={5} fill={BLUSH} opacity={0.35} />

      {/* Eyes */}
      <Ellipse cx={44} cy={46} rx={8} ry={10} fill={INK} />
      <Ellipse cx={76} cy={46} rx={8} ry={10} fill={INK} />

      {/* Mouth cavity */}
      <Rect
        x={mouthX}
        y={mouthY}
        width={mouthW}
        height={mouthH}
        rx={mouthH / 2}
        fill={INK}
      />

      {/* Tongue inside mouth */}
      {open > 0.15 && (
        <Ellipse
          cx={60}
          cy={mouthY + mouthH * 0.62}
          rx={tongueW / 2}
          ry={tongueH / 2}
          fill={TONGUE}
        />
      )}
    </Svg>
  );
}
