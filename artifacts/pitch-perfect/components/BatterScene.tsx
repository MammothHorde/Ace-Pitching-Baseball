import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  Line,
  LinearGradient as SvgGradient,
  Path,
  Polygon,
  Rect,
  Stop,
} from 'react-native-svg';

export function BatterScene() {
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 390 280"
        preserveAspectRatio="xMidYMid slice"
      >
        <Defs>
          <SvgGradient id="dirtGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#5C3D11" stopOpacity="0.2" />
            <Stop offset="1" stopColor="#7B5218" stopOpacity="0.65" />
          </SvgGradient>
          <SvgGradient id="grassGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#1B4A20" stopOpacity="0.0" />
            <Stop offset="1" stopColor="#2D6A32" stopOpacity="0.35" />
          </SvgGradient>
        </Defs>

        {/* Infield grass */}
        <Path d="M0 280 L390 280 L390 120 L0 120 Z" fill="url(#grassGrad)" />

        {/* Infield dirt trapezoid (pitcher mound area toward plate) */}
        <Path d="M105 280 L285 280 L245 110 L145 110 Z" fill="url(#dirtGrad)" />

        {/* Chalk foul lines converging toward plate */}
        <Line x1={0} y1={280} x2={195} y2={110} stroke="rgba(255,255,255,0.22)" strokeWidth={1.5} />
        <Line x1={390} y1={280} x2={195} y2={110} stroke="rgba(255,255,255,0.22)" strokeWidth={1.5} />

        {/* Pitcher's rubber hint near camera */}
        <Rect x={183} y={266} width={24} height={6} rx={3} fill="rgba(255,255,255,0.3)" />

        {/* Batter's box outlines (left side for right-handed batter) */}
        <Rect x={130} y={162} width={38} height={44} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth={1.2} />

        {/* Home plate */}
        <Path d="M195 195 L180 187 L180 176 L210 176 L210 187 Z" fill="white" opacity={0.88} />

        {/* ===== CATCHER (crouching, facing pitcher) ===== */}
        {/* Shin guards */}
        <Rect x={184} y={194} width={8} height={16} rx={3} fill="#1C3259" />
        <Rect x={198} y={194} width={8} height={16} rx={3} fill="#1C3259" />

        {/* Body / chest protector */}
        <Path d="M182 175 Q195 170 208 175 L210 194 L180 194 Z" fill="#1A2E52" />
        <Rect x={183} y={175} width={24} height={20} rx={3} fill="#22395E" />

        {/* Helmet */}
        <Path d="M182 175 Q195 158 208 175 Z" fill="#111E33" />
        <Ellipse cx={195} cy={169} rx={13} ry={11} fill="#111E33" />

        {/* Mask (cage bars) */}
        <Line x1={185} y1={167} x2={184} y2={178} stroke="#666" strokeWidth={1.5} />
        <Line x1={189} y1={165} x2={188} y2={178} stroke="#666" strokeWidth={1.5} />
        <Line x1={193} y1={164} x2={193} y2={178} stroke="#666" strokeWidth={1.5} />
        <Line x1={197} y1={164} x2={197} y2={178} stroke="#666" strokeWidth={1.5} />
        <Line x1={201} y1={165} x2={202} y2={178} stroke="#666" strokeWidth={1.5} />
        <Line x1={205} y1={167} x2={206} y2={178} stroke="#666" strokeWidth={1.5} />
        <Line x1={184} y1={169} x2={206} y2={169} stroke="#666" strokeWidth={1.5} />
        <Line x1={184} y1={173} x2={206} y2={173} stroke="#666" strokeWidth={1.5} />
        <Line x1={184} y1={177} x2={206} y2={177} stroke="#666" strokeWidth={1.5} />

        {/* Catcher's mitt extended */}
        <Circle cx={170} cy={182} r={10} fill="#7B3A0E" />
        <Circle cx={170} cy={182} r={7} fill="#9B4D14" />
        <Circle cx={170} cy={182} r={3} fill="#8B4513" />

        {/* Throwing arm */}
        <Line x1={208} y1={182} x2={218} y2={178} stroke="#F5CBA7" strokeWidth={5} strokeLinecap="round" />
        <Circle cx={222} cy={177} r={5} fill="#F5CBA7" />

        {/* ===== RIGHT-HANDED BATTER (seen from pitcher PoV – slight 3/4 back view) ===== */}
        {/* Back leg */}
        <Rect x={156} y={200} width={9} height={18} rx={3} fill="#222" />
        {/* Front leg (stepped toward plate) */}
        <Rect x={167} y={200} width={9} height={18} rx={3} fill="#222" />
        {/* Cleats */}
        <Rect x={154} y={217} width={13} height={4} rx={2} fill="#333" />
        <Rect x={165} y={217} width={13} height={4} rx={2} fill="#333" />

        {/* Jersey body */}
        <Path d="M152 178 L177 178 L175 200 L154 200 Z" fill="#C0392B" />
        {/* Number on back */}
        <Path d="M159 186 L163 186 L163 196 L159 196 Z" fill="rgba(255,255,255,0.4)" />

        {/* Helmet */}
        <Circle cx={168} cy={166} r={13} fill="#141414" />
        {/* Ear flap */}
        <Ellipse cx={160} cy={169} rx={5} ry={8} fill="#141414" />

        {/* Face (small, 3/4 view) */}
        <Ellipse cx={173} cy={168} rx={5} ry={6} fill="#F5CBA7" />

        {/* Back arm + hands */}
        <Line x1={175} y1={186} x2={188} y2={178} stroke="#F5CBA7" strokeWidth={6} strokeLinecap="round" />
        {/* Front arm */}
        <Line x1={154} y1={186} x2={162} y2={178} stroke="#F5CBA7" strokeWidth={6} strokeLinecap="round" />
        {/* Hands together on bat */}
        <Ellipse cx={188} cy={177} rx={5} ry={4} fill="#F5CBA7" />

        {/* Bat (upright, loaded) */}
        <Line x1={188} y1={177} x2={200} y2={148} stroke="#5C3317" strokeWidth={5} strokeLinecap="round" />
        <Line x1={188} y1={177} x2={200} y2={148} stroke="rgba(255,255,255,0.12)" strokeWidth={2} strokeLinecap="round" />
        {/* Bat knob */}
        <Circle cx={200} cy={147} r={4} fill="#3D2010" />

        {/* Subtle shadow beneath both figures */}
        <Ellipse cx={165} cy={221} rx={20} ry={5} fill="rgba(0,0,0,0.3)" />
        <Ellipse cx={195} cy={212} rx={18} ry={5} fill="rgba(0,0,0,0.3)" />
      </Svg>
    </View>
  );
}
