import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable, useWindowDimensions } from 'react-native';
import { X } from 'lucide-react-native';
import { PERMANENT_QUADRANTS, DECIDUOUS_QUADRANTS, isUpperTooth } from './odontogramData';
import { ToothButton } from './ToothButton';
import { FaceSelector } from './FaceSelector';
import type { ToothEntry } from '../budgetUtils';

type ArcadaValue = 'Arcada Superior' | 'Arcada Inferior' | 'Arcada Superior + Arcada Inferior';

interface OdontogramPickerProps {
  visible: boolean;
  onClose: () => void;
  teethList: ToothEntry[];
  onSelectTooth: (tooth: string) => void;
  showFaces?: boolean;
  selectedFaces?: string[];
  onToggleFace?: (faceId: string) => void;
}

const ARCADA_OPTIONS: { label: string; value: ArcadaValue }[] = [
  { label: 'Superior', value: 'Arcada Superior' },
  { label: 'Inferior', value: 'Arcada Inferior' },
  { label: 'Ambas', value: 'Arcada Superior + Arcada Inferior' },
];

export function OdontogramPicker({
  visible,
  onClose,
  teethList,
  onSelectTooth,
  showFaces = false,
  selectedFaces = [],
  onToggleFace,
}: OdontogramPickerProps) {
  const [tab, setTab] = useState<'permanent' | 'deciduous'>('permanent');
  const [selectedTooth, setSelectedTooth] = useState<string>('');
  const [selectedArchs, setSelectedArchs] = useState<string[]>([]);
  const { width: screenWidth } = useWindowDimensions();

  const quadrants = tab === 'permanent' ? PERMANENT_QUADRANTS : DECIDUOUS_QUADRANTS;
  const upperRight = quadrants.find(q => q.position === 'upper-right')!;
  const upperLeft = quadrants.find(q => q.position === 'upper-left')!;
  const lowerRight = quadrants.find(q => q.position === 'lower-right')!;
  const lowerLeft = quadrants.find(q => q.position === 'lower-left')!;

  const isToothInList = useCallback(
    (tooth: number) => teethList.some(t => t.tooth === tooth.toString()),
    [teethList]
  );

  const handleToothPress = (tooth: number) => {
    const value = tooth.toString();
    setSelectedTooth(prev => (prev === value ? '' : value));
    setSelectedArchs([]);
  };

  const handleArchToggle = (arch: string) => {
    setSelectedArchs(prev => {
      if (prev.includes(arch)) return prev.filter(a => a !== arch);
      return [...prev, arch];
    });
    setSelectedTooth('');
  };

  const handleConfirm = () => {
    if (selectedArchs.length > 0) {
      const value =
        selectedArchs.length === 2
          ? 'Arcada Superior + Arcada Inferior'
          : selectedArchs[0];
      onSelectTooth(value);
    } else if (selectedTooth) {
      onSelectTooth(selectedTooth);
    }
    resetAndClose();
  };

  const resetAndClose = () => {
    setSelectedTooth('');
    setSelectedArchs([]);
    onClose();
  };

  const hasSelection = selectedTooth !== '' || selectedArchs.length > 0;

  const renderQuadrantRow = (leftTeeth: number[], rightTeeth: number[]) => (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end' }}>
      <View style={{ flexDirection: 'row' }}>
        {leftTeeth.map(t => (
          <ToothButton
            key={t}
            tooth={t}
            isSelected={selectedTooth === t.toString()}
            isInList={isToothInList(t)}
            onPress={() => handleToothPress(t)}
          />
        ))}
      </View>
      <View
        style={{
          width: 1,
          backgroundColor: '#cbd5e1',
          marginHorizontal: 2,
          alignSelf: 'stretch',
        }}
      />
      <View style={{ flexDirection: 'row' }}>
        {rightTeeth.map(t => (
          <ToothButton
            key={t}
            tooth={t}
            isSelected={selectedTooth === t.toString()}
            isInList={isToothInList(t)}
            onPress={() => handleToothPress(t)}
          />
        ))}
      </View>
    </View>
  );

  const selectedToothNum = selectedTooth ? parseInt(selectedTooth, 10) : null;
  const showFaceSelector = showFaces && selectedToothNum && !selectedTooth.includes('Arcada') && onToggleFace;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: '#e5e7eb',
            backgroundColor: '#fff',
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: '600', color: '#111827' }}>
            Selecionar Dente
          </Text>
          <TouchableOpacity onPress={resetAndClose} hitSlop={12}>
            <X size={22} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Arcada buttons */}
          <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#9ca3af', marginBottom: 8 }}>
              Arcada Completa
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {ARCADA_OPTIONS.map(opt => {
                const isSelected =
                  opt.value === 'Arcada Superior + Arcada Inferior'
                    ? selectedArchs.length === 2
                    : selectedArchs.includes(opt.value) && selectedArchs.length < 2;
                const isInList = teethList.some(t => t.tooth.includes(opt.value.split(' + ')[0]));
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => {
                      if (opt.value === 'Arcada Superior + Arcada Inferior') {
                        setSelectedArchs(['Arcada Superior', 'Arcada Inferior']);
                        setSelectedTooth('');
                      } else {
                        handleArchToggle(opt.value);
                      }
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 8,
                      alignItems: 'center',
                      backgroundColor: isSelected ? '#b94a48' : isInList ? '#fef2f2' : '#f3f4f6',
                      borderWidth: isSelected || isInList ? 2 : 1,
                      borderColor: isSelected ? '#b94a48' : isInList ? '#fca5a5' : '#e5e7eb',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: isSelected || isInList ? '700' : '500',
                        color: isSelected ? '#fff' : isInList ? '#8b3634' : '#374151',
                      }}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginVertical: 8 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: '#e5e7eb' }} />
            <Text style={{ paddingHorizontal: 10, fontSize: 11, color: '#9ca3af' }}>
              ou selecione um dente
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#e5e7eb' }} />
          </View>

          {/* Tabs */}
          <View style={{ flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, borderRadius: 8, backgroundColor: '#f3f4f6', padding: 2 }}>
            <Pressable
              onPress={() => setTab('permanent')}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 6,
                alignItems: 'center',
                backgroundColor: tab === 'permanent' ? '#fff' : 'transparent',
                ...(tab === 'permanent' ? {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 2,
                } : {}),
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: tab === 'permanent' ? '600' : '400',
                  color: tab === 'permanent' ? '#111827' : '#6b7280',
                }}
              >
                Permanentes
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setTab('deciduous')}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 6,
                alignItems: 'center',
                backgroundColor: tab === 'deciduous' ? '#fff' : 'transparent',
                ...(tab === 'deciduous' ? {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 2,
                } : {}),
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: tab === 'deciduous' ? '600' : '400',
                  color: tab === 'deciduous' ? '#111827' : '#6b7280',
                }}
              >
                Decíduos
              </Text>
            </Pressable>
          </View>

          {/* Odontogram Grid */}
          <View
            style={{
              marginHorizontal: 16,
              backgroundColor: '#fff',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#e5e7eb',
              padding: 8,
              alignItems: 'center',
            }}
          >
            {/* Upper row */}
            {renderQuadrantRow(upperRight.teeth, upperLeft.teeth)}

            {/* Midline */}
            <View
              style={{
                width: '90%',
                height: 1,
                borderTopWidth: 1,
                borderStyle: 'dashed',
                borderColor: '#cbd5e1',
                marginVertical: 4,
              }}
            />

            {/* Lower row */}
            {renderQuadrantRow(lowerRight.teeth, lowerLeft.teeth)}
          </View>

          {/* Face Selector */}
          {showFaceSelector && (
            <View
              style={{
                marginHorizontal: 16,
                marginTop: 12,
                backgroundColor: '#fff',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#e5e7eb',
                overflow: 'hidden',
              }}
            >
              <FaceSelector
                tooth={selectedToothNum}
                selectedFaces={selectedFaces}
                onToggleFace={onToggleFace}
              />
            </View>
          )}

          {/* Selection indicator */}
          {hasSelection && (
            <View
              style={{
                marginHorizontal: 16,
                marginTop: 12,
                backgroundColor: '#eff6ff',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#bfdbfe',
                paddingHorizontal: 12,
                paddingVertical: 10,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1d4ed8' }}>
                {selectedArchs.length > 0
                  ? selectedArchs.length === 2
                    ? 'Ambas Arcadas'
                    : selectedArchs[0]
                  : `Dente ${selectedTooth}`}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setSelectedTooth('');
                  setSelectedArchs([]);
                }}
                hitSlop={8}
              >
                <X size={16} color="#60a5fa" />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Footer - Confirm button */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderTopWidth: 1,
            borderTopColor: '#e5e7eb',
            backgroundColor: '#fff',
          }}
        >
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={!hasSelection}
            style={{
              backgroundColor: hasSelection ? '#b94a48' : '#d1d5db',
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
              {hasSelection ? 'Confirmar Seleção' : 'Selecione um dente'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
