import React from 'react';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

interface NobiMascotSvgProps {
  size?: number;
}

/**
 * Pure Ring mascot — minimal open circle, no eyes or face.
 * Cool multi-tone stroke; personality comes from colour and motion elsewhere.
 */
export function NobiMascotSvg({ size = 180 }: NobiMascotSvgProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs>
        <LinearGradient id="nobiRing" x1="18" y1="14" x2="102" y2="106" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#22D3EE" />
          <Stop offset="0.34" stopColor="#3B82F6" />
          <Stop offset="0.68" stopColor="#8B5CF6" />
          <Stop offset="1" stopColor="#2DD4BF" />
        </LinearGradient>
      </Defs>

      <Circle
        cx={60}
        cy={60}
        r={38}
        fill="none"
        stroke="url(#nobiRing)"
        strokeWidth={8}
        strokeLinecap="round"
      />
    </Svg>
  );
}
