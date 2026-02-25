import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    X,
    ClipboardPaste,
    FileImage,
    Camera,
    ImageIcon,
    Sparkles,
    Trash2,
    ChevronLeft,
    Plus,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { ShoppingItem, ParsedMaterialItem } from '../../types/materials';
import { materialsService } from '../../services/materials';
import { formatCurrency } from '../../utils/materials';
import { supabase } from '../../lib/supabase';

interface ImportMaterialsModalProps {
    visible: boolean;
    onClose: () => void;
    onImportItems: (items: ShoppingItem[], invoiceUrl?: string) => void;
    clinicId: string;
}

// Base64 decoder helper (same as materials.tsx)
const decodeBase64 = (base64: string): ArrayBuffer => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const lookup = new Uint8Array(256);
    for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;
    let bufferLength = base64.length * 0.75;
    if (base64[base64.length - 1] === '=') bufferLength--;
    if (base64[base64.length - 2] === '=') bufferLength--;
    const arraybuffer = new ArrayBuffer(bufferLength);
    const bytes = new Uint8Array(arraybuffer);
    let p = 0;
    for (let i = 0; i < base64.length; i += 4) {
        const e1 = lookup[base64.charCodeAt(i)];
        const e2 = lookup[base64.charCodeAt(i + 1)];
        const e3 = lookup[base64.charCodeAt(i + 2)];
        const e4 = lookup[base64.charCodeAt(i + 3)];
        bytes[p++] = (e1 << 2) | (e2 >> 4);
        bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2);
        bytes[p++] = ((e3 & 3) << 6) | (e4 & 63);
    }
    return arraybuffer;
};

export const ImportMaterialsModal: React.FC<ImportMaterialsModalProps> = ({
    visible,
    onClose,
    onImportItems,
    clinicId,
}) => {
    const [tab, setTab] = useState<'text' | 'invoice'>('text');
    const [text, setText] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg');
    const [loading, setLoading] = useState(false);
    const [parsedItems, setParsedItems] = useState<ParsedMaterialItem[]>([]);
    const [showPreview, setShowPreview] = useState(false);

    const resetState = () => {
        setText('');
        setImageUri(null);
        setImageBase64(null);
        setParsedItems([]);
        setShowPreview(false);
        setLoading(false);
        setTab('text');
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const pickFromCamera = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permissão necessária', 'Permita o acesso à câmera para tirar fotos.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.8,
        });

        if (!result.canceled && result.assets?.[0]) {
            const asset = result.assets[0];
            setImageUri(asset.uri);
            setImageMimeType(asset.mimeType || 'image/jpeg');
            const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
            setImageBase64(base64);
        }
    };

    const pickFromGallery = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
        });

        if (!result.canceled && result.assets?.[0]) {
            const asset = result.assets[0];
            setImageUri(asset.uri);
            setImageMimeType(asset.mimeType || 'image/jpeg');
            const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
            setImageBase64(base64);
        }
    };

    const getFileType = (mime: string): string => {
        if (mime.includes('png')) return 'png';
        if (mime.includes('webp')) return 'webp';
        return 'jpeg';
    };

    const handleProcessText = async () => {
        if (!text.trim()) {
            Alert.alert('Atenção', 'Cole ou digite o texto primeiro.');
            return;
        }

        setLoading(true);
        try {
            const result = await materialsService.parseText(text, clinicId);
            if (!result.items || result.items.length === 0) {
                Alert.alert('Nenhum item encontrado', 'A IA não conseguiu identificar itens no texto. Tente reformular.');
                return;
            }
            setParsedItems(result.items);
            setShowPreview(true);
        } catch (error: any) {
            Alert.alert('Erro', error.message || 'Erro ao processar texto.');
        } finally {
            setLoading(false);
        }
    };

    const handleProcessInvoice = async () => {
        if (!imageBase64) {
            Alert.alert('Atenção', 'Selecione uma imagem primeiro.');
            return;
        }

        setLoading(true);
        try {
            const fileType = getFileType(imageMimeType);
            const result = await materialsService.parseInvoice(imageBase64, fileType, clinicId);
            if (!result.items || result.items.length === 0) {
                Alert.alert('Nenhum item encontrado', 'A IA não conseguiu identificar itens na nota fiscal. Tente outra imagem.');
                return;
            }
            setParsedItems(result.items);
            setShowPreview(true);
        } catch (error: any) {
            Alert.alert('Erro', error.message || 'Erro ao processar nota fiscal.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateParsedItem = (index: number, field: keyof ParsedMaterialItem, value: string | number) => {
        setParsedItems(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const handleRemoveParsedItem = (index: number) => {
        setParsedItems(prev => prev.filter((_, i) => i !== index));
    };

    const uploadInvoiceImage = async (): Promise<string | undefined> => {
        if (!imageBase64 || !imageUri) return undefined;
        try {
            const ext = imageUri.split('.').pop() || 'jpg';
            const path = `${clinicId}/materiais/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
            const arrayBuffer = decodeBase64(imageBase64);
            const { error } = await supabase.storage
                .from('fiscal-documents')
                .upload(path, arrayBuffer, { contentType: imageMimeType });
            if (error) throw error;
            const { data: urlData } = supabase.storage.from('fiscal-documents').getPublicUrl(path);
            return urlData.publicUrl;
        } catch (err) {
            console.error('Error uploading invoice:', err);
            return undefined;
        }
    };

    const handleConfirmImport = async () => {
        if (parsedItems.length === 0) return;

        setLoading(true);
        try {
            let invoiceUrl: string | undefined;
            if (tab === 'invoice' && imageBase64) {
                invoiceUrl = await uploadInvoiceImage();
            }

            const shoppingItems: ShoppingItem[] = parsedItems.map((item, index) => ({
                id: Date.now().toString() + index,
                name: item.name,
                quantity: item.quantity || 1,
                unitPrice: item.unitPrice || 0,
                totalPrice: (item.quantity || 1) * (item.unitPrice || 0),
                brand: item.brand || 'Sem marca',
                type: item.type || '',
                code: item.code || '',
            }));

            onImportItems(shoppingItems, invoiceUrl);
            Alert.alert('Sucesso', `${shoppingItems.length} ${shoppingItems.length === 1 ? 'item importado' : 'itens importados'}!`);
            handleClose();
        } finally {
            setLoading(false);
        }
    };

    const renderTabSelector = () => (
        <View style={{ flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, backgroundColor: '#f3f4f6', borderRadius: 10, padding: 4 }}>
            <TouchableOpacity
                onPress={() => setTab('text')}
                style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor: tab === 'text' ? '#fff' : 'transparent',
                    gap: 6,
                    ...(tab === 'text' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 } : {}),
                }}
            >
                <ClipboardPaste size={16} color={tab === 'text' ? '#b94a48' : '#6B7280'} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: tab === 'text' ? '#b94a48' : '#6B7280' }}>
                    Colar Lista
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                onPress={() => setTab('invoice')}
                style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor: tab === 'invoice' ? '#fff' : 'transparent',
                    gap: 6,
                    ...(tab === 'invoice' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 } : {}),
                }}
            >
                <FileImage size={16} color={tab === 'invoice' ? '#b94a48' : '#6B7280'} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: tab === 'invoice' ? '#b94a48' : '#6B7280' }}>
                    Nota Fiscal
                </Text>
            </TouchableOpacity>
        </View>
    );

    const renderTextTab = () => (
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                Cole a lista de materiais
            </Text>
            <TextInput
                value={text}
                onChangeText={setText}
                placeholder={"Ex:\n2x Resina A2 R$45,00\n1x Anestésico R$12,00\n3x Luvas caixa R$28,50"}
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={8}
                textAlignVertical="top"
                style={{
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 10,
                    padding: 14,
                    fontSize: 14,
                    color: '#1F2937',
                    backgroundColor: '#fff',
                    minHeight: 180,
                }}
            />
            <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 6 }}>
                Cole texto de WhatsApp, e-mail, lista de fornecedor, etc. A IA vai organizar automaticamente.
            </Text>
            <TouchableOpacity
                onPress={handleProcessText}
                disabled={loading || !text.trim()}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: (!text.trim() || loading) ? '#d1d5db' : '#b94a48',
                    paddingVertical: 14,
                    borderRadius: 10,
                    marginTop: 16,
                    gap: 8,
                }}
            >
                {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <Sparkles size={18} color="#fff" />
                )}
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                    {loading ? 'Processando com IA...' : 'Processar com IA'}
                </Text>
            </TouchableOpacity>
        </View>
    );

    const renderInvoiceTab = () => (
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 12 }}>
                Tire uma foto ou selecione da galeria
            </Text>

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                <TouchableOpacity
                    onPress={pickFromCamera}
                    style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#fff',
                        borderWidth: 1,
                        borderColor: '#D1D5DB',
                        borderRadius: 10,
                        paddingVertical: 14,
                        gap: 8,
                    }}
                >
                    <Camera size={20} color="#b94a48" />
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151' }}>Câmera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={pickFromGallery}
                    style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#fff',
                        borderWidth: 1,
                        borderColor: '#D1D5DB',
                        borderRadius: 10,
                        paddingVertical: 14,
                        gap: 8,
                    }}
                >
                    <ImageIcon size={20} color="#b94a48" />
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151' }}>Galeria</Text>
                </TouchableOpacity>
            </View>

            {imageUri ? (
                <View style={{ alignItems: 'center', marginBottom: 16 }}>
                    <Image
                        source={{ uri: imageUri }}
                        style={{ width: '100%', height: 200, borderRadius: 10 }}
                        resizeMode="contain"
                    />
                    <TouchableOpacity
                        onPress={() => { setImageUri(null); setImageBase64(null); }}
                        style={{ marginTop: 8 }}
                    >
                        <Text style={{ fontSize: 13, color: '#EF4444' }}>Remover imagem</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={{
                    borderWidth: 2,
                    borderStyle: 'dashed',
                    borderColor: '#D1D5DB',
                    borderRadius: 10,
                    paddingVertical: 40,
                    alignItems: 'center',
                    marginBottom: 16,
                }}>
                    <FileImage size={48} color="#9CA3AF" />
                    <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 8 }}>
                        Nenhuma imagem selecionada
                    </Text>
                </View>
            )}

            <TouchableOpacity
                onPress={handleProcessInvoice}
                disabled={loading || !imageBase64}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: (!imageBase64 || loading) ? '#d1d5db' : '#b94a48',
                    paddingVertical: 14,
                    borderRadius: 10,
                    gap: 8,
                }}
            >
                {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <Sparkles size={18} color="#fff" />
                )}
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                    {loading ? 'Processando com IA...' : 'Processar com IA'}
                </Text>
            </TouchableOpacity>
        </View>
    );

    const renderPreview = () => (
        <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 }}>
                <TouchableOpacity
                    onPress={() => setShowPreview(false)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                    <ChevronLeft size={20} color="#b94a48" />
                    <Text style={{ fontSize: 14, color: '#b94a48', fontWeight: '500' }}>Voltar</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>
                    {parsedItems.length} {parsedItems.length === 1 ? 'item encontrado' : 'itens encontrados'}
                </Text>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
                keyboardShouldPersistTaps="handled"
            >
                {parsedItems.map((item, index) => (
                    <View
                        key={index}
                        style={{
                            backgroundColor: '#f9fafb',
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: '#e5e7eb',
                            padding: 12,
                            marginBottom: 12,
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <TextInput
                                value={item.name}
                                onChangeText={(v) => handleUpdateParsedItem(index, 'name', v)}
                                placeholder="Nome do produto"
                                placeholderTextColor="#9CA3AF"
                                style={{
                                    flex: 1,
                                    borderWidth: 1,
                                    borderColor: '#D1D5DB',
                                    borderRadius: 8,
                                    paddingHorizontal: 10,
                                    paddingVertical: 8,
                                    fontSize: 14,
                                    color: '#1F2937',
                                    backgroundColor: '#fff',
                                }}
                            />
                            <TouchableOpacity onPress={() => handleRemoveParsedItem(index)} style={{ padding: 6 }}>
                                <Trash2 size={18} color="#EF4444" />
                            </TouchableOpacity>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>Qtd</Text>
                                <TextInput
                                    value={String(item.quantity || '')}
                                    onChangeText={(v) => handleUpdateParsedItem(index, 'quantity', parseInt(v) || 0)}
                                    keyboardType="numeric"
                                    style={{
                                        borderWidth: 1,
                                        borderColor: '#D1D5DB',
                                        borderRadius: 8,
                                        paddingHorizontal: 10,
                                        paddingVertical: 8,
                                        fontSize: 14,
                                        color: '#1F2937',
                                        backgroundColor: '#fff',
                                    }}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>Valor Unit.</Text>
                                <TextInput
                                    value={String(item.unitPrice || '')}
                                    onChangeText={(v) => handleUpdateParsedItem(index, 'unitPrice', parseFloat(v) || 0)}
                                    keyboardType="decimal-pad"
                                    style={{
                                        borderWidth: 1,
                                        borderColor: '#D1D5DB',
                                        borderRadius: 8,
                                        paddingHorizontal: 10,
                                        paddingVertical: 8,
                                        fontSize: 14,
                                        color: '#1F2937',
                                        backgroundColor: '#fff',
                                    }}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>Marca</Text>
                                <TextInput
                                    value={item.brand || ''}
                                    onChangeText={(v) => handleUpdateParsedItem(index, 'brand', v)}
                                    placeholder="Marca"
                                    placeholderTextColor="#9CA3AF"
                                    style={{
                                        borderWidth: 1,
                                        borderColor: '#D1D5DB',
                                        borderRadius: 8,
                                        paddingHorizontal: 10,
                                        paddingVertical: 8,
                                        fontSize: 14,
                                        color: '#1F2937',
                                        backgroundColor: '#fff',
                                    }}
                                />
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                            <Text style={{ fontSize: 13, color: '#6B7280' }}>Total: </Text>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937' }}>
                                {formatCurrency((item.quantity || 1) * (item.unitPrice || 0))}
                            </Text>
                        </View>
                    </View>
                ))}
            </ScrollView>

            <View style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: '#fff',
                borderTopWidth: 1,
                borderTopColor: '#e5e7eb',
                padding: 16,
                paddingBottom: Platform.OS === 'ios' ? 32 : 16,
            }}>
                <TouchableOpacity
                    onPress={handleConfirmImport}
                    disabled={loading || parsedItems.length === 0}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: (loading || parsedItems.length === 0) ? '#d1d5db' : '#b94a48',
                        paddingVertical: 14,
                        borderRadius: 10,
                        gap: 8,
                    }}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Plus size={18} color="#fff" />
                    )}
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                        {loading ? 'Importando...' : `Adicionar ${parsedItems.length} ${parsedItems.length === 1 ? 'item' : 'itens'}`}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
            <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['left', 'right', 'bottom']}>
                {/* Header */}
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 16,
                    paddingTop: Platform.OS === 'ios' ? 56 : 16,
                    paddingBottom: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: '#e5e7eb',
                    backgroundColor: '#fff',
                }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937' }}>
                        Importar Materiais
                    </Text>
                    <TouchableOpacity onPress={handleClose} style={{ padding: 4 }}>
                        <X size={24} color="#6B7280" />
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    {showPreview ? (
                        renderPreview()
                    ) : (
                        <ScrollView
                            style={{ flex: 1 }}
                            contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
                            keyboardShouldPersistTaps="handled"
                        >
                            {renderTabSelector()}
                            {tab === 'text' ? renderTextTab() : renderInvoiceTab()}
                        </ScrollView>
                    )}
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Modal>
    );
};
