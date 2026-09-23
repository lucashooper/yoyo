import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';

interface NobiMascotSvgProps {
  size?: number;
  /** 0–1 subtle energy level for hook emphasis (voice session) */
  energy?: number;
}

/**
 * Minimal abstract Nobi — Grok/Pingo-inspired geometric mascot.
 * Single SVG layer: gradient orb, soft eyes, floating hook arcs. No mouth.
 */
export function NobiMascotSvg({ size = 180, energy = 0 }: NobiMascotSvgProps) {
  const pulse = Math.max(0, Math.min(1, energy));
  const hookOpacity = 0.45 + pulse * 0.35;

  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs>
        <LinearGradient id="nobiOrb" x1="30" y1="18" x2="90" y2="108" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#7DD3EC" />
          <Stop offset="0.45" stopColor="#5CBAD6" />
          <Stop offset="1" stopColor="#3A9DBE" />
        </LinearGradient>
        <LinearGradient id="nobiHook" x1="0" y1="0" x2="120" y2="0" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#007AFF" stopOpacity="0.15" />
          <Stop offset="0.5" stopColor="#5CBAD6" stopOpacity="0.55" />
          <Stop offset="1" stopColor="#007AFF" stopOpacity="0.15" />
        </LinearGradient>
        <LinearGradient id="nobiSheen" x1="40" y1="30" x2="70" y2="70" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.45" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </LinearGradient>
      </Defs>

      {/* Floating hook arcs */}
      <G opacity={hookOpacity}>
        <Path
          d="M 22 38 C 38 18, 82 18, 98 38"
          stroke="url(#nobiHook)"
          strokeWidth={2.8}
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d="M 16 78 C 36 98, 84 98, 104 78"
          stroke="url(#nobiHook)"
          strokeWidth={2.2}
          fill="none"
          strokeLinecap="round"
          opacity={0.75}
        />
      </G>

      {/* Accent orbs — minimalist Pingo geometry */}
      <Circle cx={24} cy={58} r={4.5} fill="#007AFF" opacity={0.22 + pulse * 0.12} />
      <Circle cx={96} cy={52} r={3.5} fill="#FFD60A" opacity={0.28 + pulse * 0.1} />
      <Ellipse cx={98} cy={78} rx={3} ry={5.5} fill="#FF6482" opacity={0.24 + pulse * 0.1} />

      {/* Main orb */}
      <Circle cx={60} cy={62} r={40} fill="url(#nobiOrb)" />
      <Ellipse cx={46} cy={48} rx={16} ry={11} fill="url(#nobiSheen)" />

      {/* Soft eyes */}
      <Circle cx={48} cy={60} r={4.2} fill="#1A1F2C" opacity={0.82} />
      <Circle cx={72} cy={60} r={4.2} fill="#1A1F2C" opacity={0.82} />
      <Circle cx={49.2} cy={58.8} r={1.3} fill="#FFFFFF" opacity={0.75} />
      <Circle cx={73.2} cy={58.8} r={1.3} fill="#FFFFFF" opacity={0.75} />
    </Svg>
  );
}
