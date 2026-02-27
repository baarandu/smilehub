import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { getToothType, isUpperTooth, isRightSide } from './odontogramData';
import {
  getLateralPaths,
  getOcclusalPaths,
  LATERAL_VIEWBOX,
  OCCLUSAL_VIEWBOX,
} from './toothPathsSimple';

interface ToothButtonProps {
  tooth: number;
  isSelected: boolean;
  isInList: boolean;
  onPress: () => void;
}

const STROKE = '#c4c9d0';
const STROKE_SEL = '#3b82f6';
const DETAIL = '#d4d8de';
const DETAIL_SEL = '#93c5fd';
const IN_LIST_STROKE = '#f87171';
const IN_LIST_FILL = '#fef2f2';

function ToothButtonInner({ tooth, isSelected, isInList, onPress }: ToothButtonProps) {
  const unit = tooth % 10;
  const upper = isUpperTooth(tooth);
  const right = isRightSide(tooth);
  const type = getToothType(tooth);

  const lateral = getLateralPaths(unit, upper);
  const occlusal = getOcclusalPaths(type);

  const mirrorX = right ? 'scale(-1,1)' : '';
  const flipY = !upper ? 'scale(1,-1)' : '';
  const label = tooth.toString();

  const s = isSelected ? STROKE_SEL : isInList ? IN_LIST_STROKE : STROKE;
  const d = isSelected ? DETAIL_SEL : DETAIL;
  const fill = isSelected ? '#dbeafe' : isInList ? IN_LIST_FILL : 'white';

  const lateralSvg = (
    <Svg width={18} height={32} viewBox={LATERAL_VIEWBOX}>
      <G transform={`translate(22,29) ${mirrorX} ${flipY} translate(-22,-29)`}>
        <Path d={lateral.outline} fill={fill} stroke={s} strokeWidth={1.2} strokeLinejoin="round" />
      </G>
    </Svg>
  );

  const occlusalSvg = (
    <Svg width={14} height={14} viewBox={OCCLUSAL_VIEWBOX}>
      <Path d={occlusal.outline} fill={fill} stroke={s} strokeWidth={1.2} strokeLinejoin="round" />
      <Path d={occlusal.detail} fill="none" stroke={d} strokeWidth={0.7} />
    </Svg>
  );

  const numberText = (
    <Text
      style={{
        fontSize: 9,
        lineHeight: 10,
        fontWeight: isSelected ? '700' : '500',
        color: isSelected ? '#3b82f6' : isInList ? '#ef4444' : '#94a3b8',
        textAlign: 'center',
      }}
    >
      {label}
    </Text>
  );

  return (
    <Pressable
      onPress={onPress}
      style={{
        alignItems: 'center',
        gap: 1,
        paddingHorizontal: 1,
        paddingVertical: 2,
        borderRadius: 4,
        backgroundColor: isSelected ? 'rgba(219,234,254,0.5)' : 'transparent',
      }}
    >
      {upper ? (
        <>
          {numberText}
          {lateralSvg}
          {occlusalSvg}
        </>
      ) : (
        <>
          {occlusalSvg}
          {lateralSvg}
          {numberText}
        </>
      )}
    </Pressable>
  );
}

export const ToothButton = React.memo(ToothButtonInner);
