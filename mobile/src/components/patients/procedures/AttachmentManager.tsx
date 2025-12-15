import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Camera, Image as ImageIcon, FileText, Trash2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Attachment } from './types';

interface AttachmentManagerProps {
    files: Attachment[];
    existingAttachments: Attachment[];
    onFilesChange: (files: Attachment[]) => void;
    onRemoveExisting: (index: number) => void;
}

export function AttachmentManager({
    files,
    existingAttachments,
    onFilesChange,
    onRemoveExisting
}: AttachmentManagerProps) {

    const pickImage = async (useCamera: boolean) => {
        try {
            if (useCamera) {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permissão negada', 'É necessário permitir acesso à câmera para tirar fotos.');
                    return;
                }

                const result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    quality: 0.8,
                });

                if (!result.canceled) {
                    const newFiles = result.assets.map(asset => ({
                        uri: asset.uri,
                        name: asset.fileName || `photo_${Date.now()}.jpg`,
                        type: asset.mimeType || 'image/jpeg',
                    }));
                    onFilesChange([...files, ...newFiles]);
                }
            } else {
                const result = await ImagePicker.launchImageLibraryAsync({
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
                    onFilesChange([...files, ...newFiles]);
                }
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
                const newFiles = result.assets.map((asset: any) => ({
                    uri: asset.uri,
                    name: asset.name,
                    type: asset.mimeType || 'application/octet-stream',
                }));
                onFilesChange([...files, ...newFiles]);
            }
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível selecionar o documento');
        }
    };

    const removeFile = (index: number) => {
        Alert.alert(
            'Excluir Anexo',
            'Tem certeza que deseja excluir este anexo?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: () => onFilesChange(files.filter((_, i) => i !== index)),
                },
            ]
        );
    };

    return (
        <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">Anexos ({existingAttachments.length + files.length})</Text>

            {/* Action Buttons */}
            <View className="flex-row gap-2 mb-4">
                <TouchableOpacity
                    onPress={() => pickImage(false)}
                    className="flex-1 bg-white p-3 rounded-xl items-center justify-center border border-gray-200"
                >
                    <ImageIcon size={20} color="#0D9488" className="mb-1" />
                    <Text className="text-xs text-gray-700 font-medium">Galeria</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => pickImage(true)}
                    className="flex-1 bg-white p-3 rounded-xl items-center justify-center border border-gray-200"
                >
                    <Camera size={20} color="#0D9488" className="mb-1" />
                    <Text className="text-xs text-gray-700 font-medium">Câmera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={pickDocument}
                    className="flex-1 bg-white p-3 rounded-xl items-center justify-center border border-gray-200"
                >
                    <FileText size={20} color="#0D9488" className="mb-1" />
                    <Text className="text-xs text-gray-700 font-medium">Arquivo</Text>
                </TouchableOpacity>
            </View>

            {/* Existing Attachments */}
            {existingAttachments.length > 0 && (
                <View className="gap-2 mb-4">
                    <Text className="text-xs font-medium text-gray-500 uppercase mb-1">Anexos Salvos</Text>
                    {existingAttachments.map((attachment, index) => (
                        <View key={attachment.id || index} className="flex-row items-center bg-green-50 p-3 rounded-xl border border-green-200">
                            <View className="w-10 h-10 rounded bg-green-100 items-center justify-center mr-3 overflow-hidden">
                                <ImageIcon size={18} color="#16A34A" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-xs font-medium text-gray-900" numberOfLines={1}>{attachment.name}</Text>
                                <Text className="text-[10px] text-green-600">Salvo no servidor</Text>
                            </View>
                            <TouchableOpacity onPress={() => onRemoveExisting(index)} className="p-2">
                                <Trash2 size={16} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}

            {/* New File List */}
            {files.length > 0 && (
                <View className="gap-2 mb-4">
                    <Text className="text-xs font-medium text-gray-500 uppercase mb-1">Novos Anexos</Text>
                    {files.map((file, index) => (
                        <View key={index} className="flex-row items-center bg-white p-3 rounded-xl border border-gray-200">
                            <View className="w-8 h-8 rounded bg-gray-100 items-center justify-center mr-3">
                                <FileText size={16} color="#6B7280" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-xs font-medium text-gray-900" numberOfLines={1}>{file.name}</Text>
                                <Text className="text-[10px] text-gray-500">{file.type}</Text>
                            </View>
                            <TouchableOpacity onPress={() => removeFile(index)} className="p-2">
                                <Trash2 size={16} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
}
