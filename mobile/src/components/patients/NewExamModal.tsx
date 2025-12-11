import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Calendar, Upload, File, Image as ImageIcon, Camera, Folder } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { examsService } from '../../services/exams';
import { supabase } from '../../lib/supabase';
import type { ExamInsert, Exam } from '../../types/database';

interface NewExamModalProps {
  visible: boolean;
  patientId: string;
  onClose: () => void;
  onSuccess: () => void;
  exam?: Exam | null;
}

export function NewExamModal({
  visible,
  patientId,
  onClose,
  onSuccess,
  exam,
}: NewExamModalProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    orderDate: new Date().toISOString().split('T')[0],
    examDate: '',
  });
  const [fileType, setFileType] = useState<'document' | 'photo' | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (visible) {
      if (exam) {
        setForm({
          name: exam.name,
          orderDate: exam.order_date,
          examDate: exam.exam_date || '',
        });
        setFileType(exam.file_type);
        if (exam.file_url) {
          setSelectedFile({
            uri: exam.file_url,
            name: exam.name,
            type: exam.file_type === 'photo' ? 'image' : 'document',
          });
        }
      } else {
        setForm({
          name: '',
          orderDate: new Date().toISOString().split('T')[0],
          examDate: '',
        });
        setFileType(null);
        setSelectedFile(null);
      }
    }
  }, [visible, exam?.id]);

  const formatDateInput = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
  };

  const formatDateForDB = (dateStr: string): string | null => {
    if (!dateStr || dateStr.length < 10) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    
    // Validar data
    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) return null;
    
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  };

  const handleFileTypeSelect = (type: 'document' | 'photo') => {
    setFileType(type);
    setSelectedFile(null);
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: asset.name || 'documento',
          type: 'document',
        });
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Erro', 'Não foi possível selecionar o documento');
    }
  };

  const handlePickPhoto = async (source: 'camera' | 'library') => {
    try {
      let result;
      
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permissão necessária', 'Precisamos de permissão para acessar a câmera');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permissão necessária', 'Precisamos de permissão para acessar a galeria');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: asset.fileName || 'foto.jpg',
          type: 'photo',
        });
      }
    } catch (error) {
      console.error('Error picking photo:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a foto');
    }
  };

  const uploadFile = async (uri: string, fileName: string): Promise<string> => {
    const fileExt = fileName.split('.').pop() || 'jpg';
    const filePath = `exams/${patientId}/${Date.now()}.${fileExt}`;

    // Converter URI para blob
    const response = await fetch(uri);
    const blob = await response.blob();

    const { error: uploadError } = await supabase.storage
      .from('patient-documents')
      .upload(filePath, blob);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('patient-documents')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!form.name || !form.orderDate) {
      Alert.alert('Erro', 'Nome e data do pedido são obrigatórios');
      return;
    }

    try {
      setSaving(true);
      setUploading(true);

      let fileUrl = exam?.file_url || null;

      // Upload novo arquivo se houver
      if (selectedFile && selectedFile.uri && !selectedFile.uri.startsWith('http')) {
        fileUrl = await uploadFile(selectedFile.uri, selectedFile.name);
      }

      const examData: ExamInsert = {
        patient_id: patientId,
        name: form.name,
        order_date: form.orderDate.includes('-') ? form.orderDate : formatDateForDB(form.orderDate) || form.orderDate,
        exam_date: form.examDate ? (form.examDate.includes('-') ? form.examDate : formatDateForDB(form.examDate) || null) : null,
        file_url: fileUrl,
        file_type: fileType,
      };

      if (exam) {
        await examsService.update(exam.id, examData);
        Alert.alert('Sucesso', 'Exame atualizado!');
      } else {
        await examsService.create(examData);
        Alert.alert('Sucesso', 'Exame registrado!');
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving exam:', error);
      Alert.alert('Erro', `Não foi possível ${exam ? 'atualizar' : 'registrar'} o exame`);
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-gray-50">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200 bg-white">
            <Text className="text-lg font-semibold text-gray-900">
              {exam ? 'Editar Exame' : 'Novo Exame'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-4 py-4">
            <View className="gap-4">
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">Nome do Exame *</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                  value={form.name}
                  onChangeText={(text) => setForm({ ...form, name: text })}
                  placeholder="Ex: Raio-X Panorâmico"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">Data do Pedido *</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                  value={form.orderDate.includes('-') 
                    ? new Date(form.orderDate + 'T00:00:00').toLocaleDateString('pt-BR')
                    : form.orderDate}
                  onChangeText={(text) => {
                    const formatted = formatDateInput(text);
                    if (formatted.length === 10) {
                      const dbDate = formatDateForDB(formatted);
                      if (dbDate) {
                        setForm({ ...form, orderDate: dbDate });
                        return;
                      }
                    }
                    setForm({ ...form, orderDate: formatted });
                  }}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">Data de Realização</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                  value={form.examDate.includes('-') && form.examDate
                    ? new Date(form.examDate + 'T00:00:00').toLocaleDateString('pt-BR')
                    : form.examDate}
                  onChangeText={(text) => {
                    const formatted = formatDateInput(text);
                    if (formatted.length === 10) {
                      const dbDate = formatDateForDB(formatted);
                      if (dbDate) {
                        setForm({ ...form, examDate: dbDate });
                        return;
                      }
                    }
                    setForm({ ...form, examDate: formatted });
                  }}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>

              {/* Upload Section */}
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">Arquivo</Text>
                {!fileType ? (
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => handleFileTypeSelect('document')}
                      className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 flex-row items-center justify-center gap-2"
                    >
                      <File size={18} color="#0D9488" />
                      <Text className="text-teal-600 font-medium">Documento</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleFileTypeSelect('photo')}
                      className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 flex-row items-center justify-center gap-2"
                    >
                      <ImageIcon size={18} color="#0D9488" />
                      <Text className="text-teal-600 font-medium">Foto</Text>
                    </TouchableOpacity>
                  </View>
                ) : fileType === 'document' ? (
                  <View className="space-y-2">
                    <TouchableOpacity
                      onPress={handlePickDocument}
                      className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex-row items-center justify-center gap-2"
                    >
                      <Folder size={18} color="#0D9488" />
                      <Text className="text-teal-600 font-medium">
                        {selectedFile ? 'Trocar Documento' : 'Selecionar Documento'}
                      </Text>
                    </TouchableOpacity>
                    {selectedFile && (
                      <View className="bg-gray-50 rounded-lg p-3">
                        <Text className="text-sm text-gray-700">{selectedFile.name}</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      onPress={() => {
                        setFileType(null);
                        setSelectedFile(null);
                      }}
                      className="items-center py-2"
                    >
                      <Text className="text-gray-500 text-sm">Cancelar</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View className="space-y-2">
                    {!selectedFile ? (
                      <View className="flex-row gap-2">
                        <TouchableOpacity
                          onPress={() => handlePickPhoto('camera')}
                          className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 flex-row items-center justify-center gap-2"
                        >
                          <Camera size={18} color="#0D9488" />
                          <Text className="text-teal-600 font-medium">Câmera</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handlePickPhoto('library')}
                          className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 flex-row items-center justify-center gap-2"
                        >
                          <Folder size={18} color="#0D9488" />
                          <Text className="text-teal-600 font-medium">Álbum</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View className="space-y-2">
                        <Image
                          source={{ uri: selectedFile.uri }}
                          className="w-full h-48 rounded-lg"
                          resizeMode="contain"
                        />
                        <TouchableOpacity
                          onPress={() => {
                            setFileType(null);
                            setSelectedFile(null);
                          }}
                          className="items-center py-2"
                        >
                          <Text className="text-gray-500 text-sm">Remover Foto</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    <TouchableOpacity
                      onPress={() => {
                        setFileType(null);
                        setSelectedFile(null);
                      }}
                      className="items-center py-2"
                    >
                      <Text className="text-gray-500 text-sm">Cancelar</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            <View className="h-8" />
          </ScrollView>

          {/* Footer */}
          <View className="p-4 border-t border-gray-200 bg-white">
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving || uploading}
              className="bg-teal-500 rounded-xl px-6 py-4 items-center"
            >
              {saving || uploading ? (
                <Text className="text-white font-semibold">Salvando...</Text>
              ) : (
                <Text className="text-white font-semibold">Salvar</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

