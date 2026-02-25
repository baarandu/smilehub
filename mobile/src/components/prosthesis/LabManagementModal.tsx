import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, Switch, Alert, ActivityIndicator } from 'react-native';
import { X, Plus, Edit3, Trash2, Building2 } from 'lucide-react-native';
import { useProsthesisLabs } from '../../hooks/useProsthesis';
import { prosthesisService } from '../../services/prosthesis';
import { useClinic } from '../../contexts/ClinicContext';
import type { ProsthesisLab } from '../../types/prosthesis';

interface LabManagementModalProps {
  visible: boolean;
  onClose: () => void;
}

export function LabManagementModal({ visible, onClose }: LabManagementModalProps) {
  const { clinicId } = useClinic();
  const { labs, loading, refetch } = useProsthesisLabs();
  const [editing, setEditing] = useState<'new' | ProsthesisLab | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setName(''); setPhone(''); setEmail(''); setContactPerson(''); setAddress(''); setNotes('');
    setEditing(null);
  };

  const startEdit = (lab: ProsthesisLab) => {
    setName(lab.name);
    setPhone(lab.phone || '');
    setEmail(lab.email || '');
    setContactPerson(lab.contact_person || '');
    setAddress(lab.address || '');
    setNotes(lab.notes || '');
    setEditing(lab);
  };

  const handleSave = async () => {
    if (!name.trim() || !clinicId) return;
    try {
      setSaving(true);
      const payload = {
        clinic_id: clinicId,
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        contact_person: contactPerson.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      };

      if (editing === 'new') {
        await prosthesisService.createLab(payload);
      } else if (editing) {
        await prosthesisService.updateLab(editing.id, payload);
      }
      resetForm();
      refetch();
    } catch (e) {
      console.error('Error saving lab:', e);
      Alert.alert('Erro', 'Não foi possível salvar o laboratório.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (lab: ProsthesisLab) => {
    try {
      await prosthesisService.updateLab(lab.id, { is_active: !lab.is_active });
      refetch();
    } catch (e) {
      console.error('Error toggling lab:', e);
    }
  };

  const handleDelete = (lab: ProsthesisLab) => {
    Alert.alert(
      'Excluir Laboratório',
      `Tem certeza que deseja excluir "${lab.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir', style: 'destructive',
          onPress: async () => {
            try {
              await prosthesisService.deleteLab(lab.id);
              refetch();
            } catch (e) {
              console.error('Error deleting lab:', e);
              Alert.alert('Erro', 'Não foi possível excluir.');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white border-b border-gray-100 px-4 pt-14 pb-4 flex-row justify-between items-center">
          <View>
            <Text className="text-xl font-bold text-gray-900">Laboratórios</Text>
            <Text className="text-sm text-gray-500">Gerencie seus parceiros</Text>
          </View>
          <View className="flex-row gap-3">
            {!editing && (
              <TouchableOpacity
                onPress={() => setEditing('new')}
                className="bg-[#b94a48] p-2.5 rounded-xl"
              >
                <Plus size={20} color="#FFF" />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} className="p-2.5">
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1 p-4">
          {/* Form */}
          {editing && (
            <View className="bg-white rounded-xl p-4 border border-gray-100 mb-4">
              <Text className="font-semibold text-gray-900 mb-3">
                {editing === 'new' ? 'Novo Laboratório' : 'Editar Laboratório'}
              </Text>

              <Text className="text-xs text-gray-500 mb-1">Nome *</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Nome do laboratório"
                className="border border-gray-200 rounded-lg px-3 py-2.5 mb-3 text-gray-900"
              />

              <View className="flex-row gap-3 mb-3">
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 mb-1">Telefone</Text>
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="(00) 0000-0000"
                    keyboardType="phone-pad"
                    className="border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 mb-1">Email</Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="email@lab.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900"
                  />
                </View>
              </View>

              <Text className="text-xs text-gray-500 mb-1">Pessoa de Contato</Text>
              <TextInput
                value={contactPerson}
                onChangeText={setContactPerson}
                placeholder="Nome do contato"
                className="border border-gray-200 rounded-lg px-3 py-2.5 mb-3 text-gray-900"
              />

              <Text className="text-xs text-gray-500 mb-1">Endereço</Text>
              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder="Endereço"
                className="border border-gray-200 rounded-lg px-3 py-2.5 mb-3 text-gray-900"
              />

              <Text className="text-xs text-gray-500 mb-1">Observações</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Observações"
                multiline
                numberOfLines={2}
                className="border border-gray-200 rounded-lg px-3 py-2.5 mb-4 text-gray-900"
                style={{ textAlignVertical: 'top' }}
              />

              <View className="flex-row gap-3">
                <TouchableOpacity onPress={resetForm} className="flex-1 py-2.5 rounded-xl border border-gray-200 items-center">
                  <Text className="text-gray-600 font-medium">Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={!name.trim() || saving}
                  className={`flex-1 py-2.5 rounded-xl items-center ${name.trim() ? 'bg-[#b94a48]' : 'bg-gray-200'}`}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text className={`font-medium ${name.trim() ? 'text-white' : 'text-gray-400'}`}>Salvar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Labs List */}
          {loading ? (
            <ActivityIndicator size="large" color="#b94a48" className="mt-8" />
          ) : labs.length === 0 ? (
            <View className="items-center py-12">
              <Building2 size={40} color="#D1D5DB" />
              <Text className="text-gray-400 mt-3">Nenhum laboratório cadastrado</Text>
            </View>
          ) : (
            labs.map(lab => (
              <View
                key={lab.id}
                className={`bg-white rounded-xl p-4 border border-gray-100 mb-3 ${!lab.is_active ? 'opacity-60' : ''}`}
              >
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 mr-3">
                    <Text className="font-semibold text-gray-900">{lab.name}</Text>
                    {lab.phone && <Text className="text-sm text-gray-500 mt-1">{lab.phone}</Text>}
                    {lab.email && <Text className="text-sm text-gray-500">{lab.email}</Text>}
                    {lab.contact_person && <Text className="text-sm text-gray-400">{lab.contact_person}</Text>}
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Switch
                      value={lab.is_active}
                      onValueChange={() => handleToggleActive(lab)}
                      trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
                      thumbColor={lab.is_active ? '#15803D' : '#f4f3f4'}
                    />
                    <TouchableOpacity onPress={() => startEdit(lab)} className="p-2">
                      <Edit3 size={16} color="#6B7280" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(lab)} className="p-2">
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
