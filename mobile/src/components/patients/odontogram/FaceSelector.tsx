import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { getToothType, isUpperTooth, isRightSide, getFaceRegion, getRegionFace, type FaceRegion } from './odontogramData';
import { getOcclusalPaths, getOcclusalFaceRegions, OCCLUSAL_VIEWBOX } from './toothPathsSimple';

interface FaceSelectorProps {
  tooth: number;
  selectedFaces: string[];
  onToggleFace: (faceId: string) => void;
}

const FACE_LABELS: Record<string, string> = {
  M: 'Mesial',
  D: 'Distal',
  O: 'Oclusal',
  V: 'Vestibular',
  L: 'Lingual',
  P: 'Palatina',
};

const ALL_REGIONS: FaceRegion[] = ['top', 'bottom', 'left', 'right', 'center'];

const SVG_SIZE = 140;

export function FaceSelector({ tooth, selectedFaces, onToggleFace }: FaceSelectorProps) {
  const type = getToothType(tooth);
  const upper = isUpperTooth(tooth);
  const right = isRightSide(tooth);
  const occlusal = getOcclusalPaths(type);
  const faceRegions = getOcclusalFaceRegions(type);

  const activeSet = new Set(
    selectedFaces
      .map(f => getFaceRegion(tooth, f))
      .filter((r): r is FaceRegion => r !== null)
  );

  const handleRegionPress = (region: FaceRegion) => {
    onToggleFace(getRegionFace(tooth, region));
  };

  // Label positions relative to SVG center
  // The viewBox is 0 0 32 32, scaled to SVG_SIZE
  const labelForRegion = (region: FaceRegion) => {
    const faceId = getRegionFace(tooth, region);
    const abbrev = faceId;
    const fullName = FACE_LABELS[faceId] || faceId;
    const isActive = activeSet.has(region);

    let top = 0;
    let left = 0;

    switch (region) {
      case 'top':
        top = -4;
        left = SVG_SIZE / 2;
        break;
      case 'bottom':
        top = SVG_SIZE + 4;
        left = SVG_SIZE / 2;
        break;
      case 'left':
        top = SVG_SIZE / 2;
        left = -4;
        break;
      case 'right':
        top = SVG_SIZE / 2;
        left = SVG_SIZE + 4;
        break;
      case 'center':
        top = SVG_SIZE / 2;
        left = SVG_SIZE / 2;
        break;
    }

    return (
      <Text
        key={region}
        style={{
          position: 'absolute',
          top,
          left,
          transform: [
            { translateX: region === 'left' ? -30 : region === 'right' ? 6 : -12 },
            { translateY: region === 'top' ? -18 : region === 'bottom' ? 2 : -8 },
          ],
          fontSize: 11,
          fontWeight: isActive ? '700' : '500',
          color: isActive ? '#3b82f6' : '#64748b',
          textAlign: 'center',
          width: 24,
        }}
      >
        {abbrev}
      </Text>
    );
  };

  return (
    <View style={{ alignItems: 'center', paddingVertical: 12 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
        Faces do Dente {tooth} *
      </Text>
      <Text style={{ fontSize: 11, color: '#9ca3af', marginBottom: 12 }}>
        Toque nas regiões para selecionar
      </Text>
      <View style={{ width: SVG_SIZE + 60, height: SVG_SIZE + 40, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'relative', width: SVG_SIZE, height: SVG_SIZE }}>
          <Svg width={SVG_SIZE} height={SVG_SIZE} viewBox={OCCLUSAL_VIEWBOX}>
            {/* Outline */}
            <Path
              d={occlusal.outline}
              fill="white"
              stroke="#c4c9d0"
              strokeWidth={0.8}
              strokeLinejoin="round"
            />
            {/* Face regions (pressable) */}
            {ALL_REGIONS.map(region => {
              const isActive = activeSet.has(region);
              return (
                <Path
                  key={region}
                  d={faceRegions[region]}
                  fill={isActive ? '#3b82f6' : '#e2e8f0'}
                  opacity={isActive ? 0.85 : 0.3}
                  onPress={() => handleRegionPress(region)}
                />
              );
            })}
            {/* Detail lines on top */}
            <Path d={occlusal.detail} fill="none" stroke="#d4d8de" strokeWidth={0.5} />
          </Svg>
          {/* Labels around the SVG */}
          {ALL_REGIONS.filter(r => r !== 'center').map(labelForRegion)}
          {labelForRegion('center')}
        </View>
      </View>
      {/* Selected faces summary */}
      {selectedFaces.length > 0 && (
        <Text style={{ fontSize: 12, color: '#3b82f6', fontWeight: '600', marginTop: 4 }}>
          {selectedFaces.map(f => FACE_LABELS[f] || f).join(', ')}
        </Text>
      )}
    </View>
  );
}
