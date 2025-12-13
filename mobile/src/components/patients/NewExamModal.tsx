import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import { X, Calendar, Upload, Camera, Image as ImageIcon, FileText, Trash2, CheckCircle } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { examsService } from '../../services/exams';

interface NewExamModalProps {
  visible: boolean;
  patientId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface SelectedFile {
  uri: string;
  name: string;
  type: string;
}

export function NewExamModal({ visible, patientId, onClose, onSuccess }: NewExamModalProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [loading, setLoading] = useState(false);

  const pickImage = async (useCamera: boolean) => {
    try {
      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        })
        : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          allowsMultipleSelection: true,
        });

      if (!result.canceled) {
        const newFiles = result.assets.map(asset => ({
          uri: asset.uri,
          name: asset.fileName || `photo_${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        }));
        setFiles(prev => [...prev, ...newFiles]);
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível selecionar a imagem');
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        multiple: true,
      });

      if (!result.canceled) {
        const newFiles = result.assets.map(asset => ({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || 'application/octet-stream',
        }));
        setFiles(prev => [...prev, ...newFiles]);
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível selecionar o documento');
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Erro', 'Por favor, informe o título do exame');
      return;
    }
    if (files.length === 0) {
      Alert.alert('Erro', 'Por favor, anexe pelo menos um arquivo');
      return;
    }

    try {
      setLoading(true);
      const uploadedUrls = [];

      // Upload files one by one
      for (const file of files) {
        const url = await examsService.uploadFile(file);
        uploadedUrls.push(url);
      }

      await examsService.create({
        patient_id: patientId,
        title,
        name: title,
        date,
        order_date: date,
        description,
        file_urls: uploadedUrls,
        type: 'exam'
      });

      Alert.alert('Sucesso', 'Exame adicionado com sucesso!');
      onSuccess();
      handleClose();
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível salvar o exame');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setFiles([]);
    onClose();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl h-[85%]">
          {/* Header */}
          <View className="flex-row justify-between items-center p-6 border-b border-gray-100">
            <Text className="text-xl font-bold text-gray-900">Novo Exame</Text>
            <TouchableOpacity onPress={handleClose}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 p-6">
            {/* Title */}
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">Título do Exame *</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-900"
                placeholder="Ex: Raio-X Panorâmico"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Date */}
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">Data *</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-900"
                placeholder="YYYY-MM-DD"
                value={date}
                onChangeText={setDate}
              />
            </View>

            {/* Description */}
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">Descrição / Observações</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-900 h-24"
                placeholder="Adicione detalhes sobre o exame..."
                value={description}
                onChangeText={setDescription}
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* Attachments */}
            <View className="mb-6">
              <Text className="text-gray-700 font-medium mb-3">Anexos ({files.length})</Text>

              {/* Action Buttons */}
              <View className="flex-row gap-2 mb-4">
                <TouchableOpacity
                  onPress={() => pickImage(false)}
                  className="flex-1 bg-teal-50 p-3 rounded-xl items-center justify-center border border-teal-100"
                >
                  <ImageIcon size={20} color="#0D9488" className="mb-1" />
                  <Text className="text-xs text-teal-700 font-medium">Galeria</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => pickImage(true)}
                  className="flex-1 bg-teal-50 p-3 rounded-xl items-center justify-center border border-teal-100"
                >
                  <Camera size={20} color="#0D9488" className="mb-1" />
                  <Text className="text-xs text-teal-700 font-medium">Câmera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={pickDocument}
                  className="flex-1 bg-teal-50 p-3 rounded-xl items-center justify-center border border-teal-100"
                >
                  <FileText size={20} color="#0D9488" className="mb-1" />
                  <Text className="text-xs text-teal-700 font-medium">Arquivo</Text>
                </TouchableOpacity>
              </View>

              {/* File List */}
              {files.length > 0 ? (
                <View className="gap-2">
                  {files.map((file, index) => (
                    <View key={index} className="flex-row items-center bg-gray-50 p-3 rounded-xl border border-gray-200">
                      {file.type.includes('image') ? (
                        <Image source={{ uri: file.uri }} className="w-10 h-10 rounded-lg mr-3 bg-gray-200" />
                      ) : (
                        <View className="w-10 h-10 rounded-lg mr-3 bg-gray-200 items-center justify-center">
                          <FileText size={20} color="#6B7280" />
                        </View>
                      )}
                      <View className="flex-1">
                        <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>{file.name}</Text>
                        <Text className="text-xs text-gray-500">{file.type}</Text>
                      </View>
                      <TouchableOpacity onPress={() => removeFile(index)} className="p-2">
                        <Trash2 size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : (
                <View className="items-center justify-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                  <Upload size={32} color="#D1D5DB" />
                  <Text className="text-gray-400 mt-2 text-sm">Nenhum arquivo selecionado</Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer */}
          <View className="p-6 border-t border-gray-100 bg-white">
            <TouchableOpacity
              onPress={handleSave}
              disabled={loading || !title.trim() || files.length === 0}
              className={`w-full py-4 rounded-xl items-center flex-row justify-center gap-2 ${loading || !title.trim() || files.length === 0 ? 'bg-gray-300' : 'bg-teal-500'
                }`}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <CheckCircle size={20} color="white" />
                  <Text className="text-white font-bold text-lg">Salvar Exame</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

