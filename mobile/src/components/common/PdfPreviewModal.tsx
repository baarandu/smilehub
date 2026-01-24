import React from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { X, Share2 } from 'lucide-react-native';

interface PdfPreviewModalProps {
    visible: boolean;
    onClose: () => void;
    onShare: () => void;
    loading?: boolean;
    htmlContent?: string | null;
    title?: string;
}

export function PdfPreviewModal({
    visible,
    onClose,
    onShare,
    loading = false,
    htmlContent = null,
    title = 'Pré-visualização do PDF',
}: PdfPreviewModalProps) {
    const insets = useSafeAreaInsets();

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View className="flex-1 bg-gray-100" style={{ paddingTop: insets.top }}>
                {/* Header */}
                <View className="bg-white border-b border-gray-200 px-4 py-3 flex-row items-center justify-between">
                    <Text className="text-lg font-semibold text-gray-900">{title}</Text>
                    <TouchableOpacity onPress={onClose} className="p-2 bg-gray-100 rounded-full">
                        <X size={20} color="#6B7280" />
                    </TouchableOpacity>
                </View>

                {/* Preview Content */}
                <View className="flex-1 bg-white m-3 rounded-xl overflow-hidden shadow-sm border border-gray-200">
                    {loading ? (
                        <View className="flex-1 items-center justify-center">
                            <ActivityIndicator size="large" color="#b94a48" />
                            <Text className="text-gray-500 mt-3">Gerando pré-visualização...</Text>
                        </View>
                    ) : htmlContent ? (
                        <WebView
                            originWhitelist={['*']}
                            source={{ html: htmlContent }}
                            style={{ flex: 1 }}
                            scalesPageToFit={true}
                            showsVerticalScrollIndicator={true}
                        />
                    ) : (
                        <View className="flex-1 items-center justify-center">
                            <Text className="text-gray-500">Não foi possível carregar a pré-visualização</Text>
                        </View>
                    )}
                </View>

                {/* Action Buttons */}
                <View
                    className="flex-row gap-3 px-4 py-3 bg-white border-t border-gray-100"
                    style={{ paddingBottom: insets.bottom + 12 }}
                >
                    <TouchableOpacity
                        onPress={onClose}
                        className="flex-1 py-4 bg-gray-100 rounded-xl items-center"
                    >
                        <Text className="font-medium text-gray-600">Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={onShare}
                        disabled={loading || !htmlContent}
                        className={`flex-1 py-4 rounded-xl items-center flex-row justify-center gap-2 ${loading || !htmlContent ? 'bg-[#c95a58]' : 'bg-[#a03f3d]'}`}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Share2 size={18} color="white" />
                                <Text className="font-medium text-white">Compartilhar</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}
