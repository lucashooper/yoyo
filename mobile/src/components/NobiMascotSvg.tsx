import React from 'react';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Stop } from 'react-native-svg';

interface NobiMascotSvgProps {
  size?: number;
}

/** Static soft gradient orb — cyan / blue / purple with minimal dot eyes. */
export function NobiMascotSvg({ size = 180 }: NobiMascotSvgProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs>
        <LinearGradient id="nobiOrbFill" x1="24" y1="16" x2="96" y2="104" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#6EE7FF" />
          <Stop offset="0.42" stopColor="#4DA3FF" />
          <Stop offset="1" stopColor="#8B7CF6" />
        </LinearGradient>
        <LinearGradient id="nobiOrbSheen" x1="38" y1="28" x2="72" y2="68" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.5" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </LinearGradient>
      </Defs>

      <Circle cx={60} cy={60} r={44} fill="url(#nobiOrbFill)" />
      <Ellipse cx={47} cy={46} rx={18} ry={12} fill="url(#nobiOrbSheen)" />

      <Circle cx={48} cy={62} r={3.6} fill="#1A1F2C" opacity={0.78} />
      <Circle cx={72} cy={62} r={3.6} fill="#1A1F2C" opacity={0.78} />
    </Svg>
  );
}
