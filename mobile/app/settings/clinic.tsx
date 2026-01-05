import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Building2, Upload, X, Save, Image as ImageIcon, Users } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { profileService } from '../../src/services/profile';
import { useClinic } from '../../src/contexts/ClinicContext';
import { TeamManagementModal } from '../../src/components/TeamManagementModal';

export default function ClinicSettings() {
    const router = useRouter();
    const { isAdmin } = useClinic();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState('');
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [showTeamModal, setShowTeamModal] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const info = await profileService.getClinicInfo();
            setName(info.clinicName);
            setLogoUrl(info.logoUrl);
        } catch (error) {
            console.error('Error loading clinic info:', error);
            Alert.alert('Erro', 'Não foi possível carregar as informações.');
        } finally {
            setLoading(false);
        }
    };

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            try {
                setSaving(true);
                const newUrl = await profileService.uploadLogo(result.assets[0].uri);
                setLogoUrl(newUrl);
                Alert.alert('Sucesso', 'Logo atualizado com sucesso!');
            } catch (error) {
                console.error('Error uploading logo:', error);
                Alert.alert('Erro', 'Falha ao atualizar o logo.');
            } finally {
                setSaving(false);
            }
        }
    };

    const handleRemoveLogo = async () => {
        Alert.alert(
            'Remover Logo',
            'Tem certeza que deseja remover o logo da clínica?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Remover',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setSaving(true);
                            await profileService.removeLogo();
                            setLogoUrl(null);
                            Alert.alert('Sucesso', 'Logo removido.');
                        } catch (error) {
                            Alert.alert('Erro', 'Falha ao remover o logo.');
                        } finally {
                            setSaving(false);
                        }
                    }
                }
            ]
        );
    };

    const handleSaveName = async () => {
        if (!name.trim()) {
            Alert.alert('Erro', 'O nome da clínica é obrigatório.');
            return;
        }

        try {
            setSaving(true);
            await profileService.updateClinicName(name.trim());
            Alert.alert('Sucesso', 'Nome da clínica atualizado!');
        } catch (error) {
            console.error('Error updating name:', error);
            Alert.alert('Erro', 'Falha ao salvar o nome.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
                <ActivityIndicator size="large" color="#0D9488" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="flex-row items-center p-4 bg-white border-b border-gray-100">
                <TouchableOpacity onPress={() => router.back()} className="mr-3">
                    <ChevronLeft size={24} color="#374151" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-gray-900">Minha Clínica</Text>
            </View>

            <ScrollView className="flex-1 p-4">
                {/* Logo Section */}
                <View className="bg-white p-6 rounded-2xl border border-gray-100 mb-6 items-center">
                    <View className="relative mb-4">
                        {logoUrl ? (
                            <View className="w-32 h-32 rounded-2xl border border-gray-100 p-2 bg-white shadow-sm">
                                <Image
                                    source={{ uri: logoUrl }}
                                    className="w-full h-full"
                                    resizeMode="contain"
                                />
                                <TouchableOpacity
                                    onPress={handleRemoveLogo}
                                    className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1.5 shadow-sm"
                                >
                                    <X size={14} color="white" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View className="w-32 h-32 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 items-center justify-center">
                                <ImageIcon size={32} color="#9CA3AF" />
                                <Text className="text-xs text-gray-400 font-medium mt-2">SEM LOGO</Text>
                            </View>
                        )}
                    </View>

                    <TouchableOpacity
                        onPress={handlePickImage}
                        disabled={saving}
                        className="bg-teal-50 px-4 py-2 rounded-xl flex-row items-center gap-2 border border-teal-100"
                    >
                        {saving ? (
                            <ActivityIndicator size={16} color="#0D9488" />
                        ) : (
                            <>
                                <Upload size={16} color="#0D9488" />
                                <Text className="text-teal-700 font-medium">
                                    {logoUrl ? 'Alterar Logo' : 'Adicionar Logo'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Name Section */}
                <View className="bg-white p-6 rounded-2xl border border-gray-100 mb-6">
                    <Text className="text-gray-900 font-semibold mb-2 flex-row items-center gap-2">
                        <Building2 size={16} color="#374151" />
                        Nome da Clínica
                    </Text>

                    <View className="flex-row gap-3">
                        <TextInput
                            value={name}
                            onChangeText={setName}
                            placeholder="Digite o nome da clínica"
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                        />
                    </View>

                    <TouchableOpacity
                        onPress={handleSaveName}
                        disabled={saving}
                        className="bg-teal-600 mt-4 py-3 rounded-xl flex-row items-center justify-center gap-2"
                    >
                        {saving ? (
                            <ActivityIndicator size={20} color="white" />
                        ) : (
                            <>
                                <Save size={20} color="white" />
                                <Text className="text-white font-bold">Salvar Nome</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Team Management Section (Admin Only) */}
                {isAdmin && (
                    <TouchableOpacity
                        className="bg-white p-4 rounded-2xl border border-gray-100 flex-row items-center justify-between"
                        onPress={() => setShowTeamModal(true)}
                    >
                        <View className="flex-row items-center gap-3">
                            <View className="w-10 h-10 bg-indigo-50 rounded-full items-center justify-center">
                                <Users size={20} color="#6366f1" />
                            </View>
                            <View>
                                <Text className="text-gray-900 font-semibold">Gerenciar Equipe</Text>
                                <Text className="text-gray-500 text-sm">Adicionar ou remover membros</Text>
                            </View>
                        </View>
                        <ChevronLeft size={20} color="#9ca3af" style={{ transform: [{ rotate: '180deg' }] }} />
                    </TouchableOpacity>
                )}
            </ScrollView>

            <TeamManagementModal
                visible={showTeamModal}
                onClose={() => setShowTeamModal(false)}
            />
        </SafeAreaView>
    );
}
