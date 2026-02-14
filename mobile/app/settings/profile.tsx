import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, User, Save } from 'lucide-react-native';
import { profileService } from '../../src/services/profile';
import { useClinic } from '../../src/contexts/ClinicContext';

export default function ProfileSettings() {
    const router = useRouter();
    const { isDentist, refetch } = useClinic();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [fullName, setFullName] = useState('');
    const [gender, setGender] = useState('');
    const [cro, setCro] = useState('');

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            setLoading(true);
            const profile = await profileService.getCurrentProfile();
            if (profile) {
                setFullName(profile.full_name || '');
                setGender(profile.gender || '');
                setCro(profile.cro || '');
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            Alert.alert('Erro', 'Não foi possível carregar o perfil.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!fullName.trim()) {
            Alert.alert('Atenção', 'O nome é obrigatório.');
            return;
        }

        try {
            setSaving(true);
            await profileService.updateProfile({
                full_name: fullName.trim(),
                gender: gender || undefined,
                cro: cro.trim() || undefined,
            });
            await refetch();
            Alert.alert('Sucesso', 'Perfil atualizado!');
        } catch (error) {
            console.error('Error saving profile:', error);
            Alert.alert('Erro', 'Não foi possível salvar o perfil.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
                <TouchableOpacity onPress={() => router.back()} className="mr-3">
                    <ChevronLeft size={24} color="#374151" />
                </TouchableOpacity>
                <User size={20} color="#a03f3d" />
                <Text className="text-lg font-bold text-gray-900 ml-2">Meu Perfil</Text>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#a03f3d" />
                </View>
            ) : (
                <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
                    {/* Name */}
                    <View className="mb-4">
                        <Text className="text-sm font-medium text-gray-700 mb-1">Nome Completo *</Text>
                        <TextInput
                            className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                            value={fullName}
                            onChangeText={setFullName}
                            placeholder="Seu nome completo"
                        />
                    </View>

                    {/* Gender */}
                    <View className="mb-4">
                        <Text className="text-sm font-medium text-gray-700 mb-1">Gênero</Text>
                        <View className="flex-row gap-3">
                            <TouchableOpacity
                                className={`flex-1 py-3 rounded-xl border ${gender === 'male' ? 'bg-[#a03f3d]/10 border-[#a03f3d]' : 'bg-white border-gray-200'}`}
                                onPress={() => setGender('male')}
                            >
                                <Text className={`text-center font-medium ${gender === 'male' ? 'text-[#a03f3d]' : 'text-gray-700'}`}>
                                    Masculino
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className={`flex-1 py-3 rounded-xl border ${gender === 'female' ? 'bg-[#a03f3d]/10 border-[#a03f3d]' : 'bg-white border-gray-200'}`}
                                onPress={() => setGender('female')}
                            >
                                <Text className={`text-center font-medium ${gender === 'female' ? 'text-[#a03f3d]' : 'text-gray-700'}`}>
                                    Feminino
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* CRO - only for dentists */}
                    {isDentist && (
                        <View className="mb-4">
                            <Text className="text-sm font-medium text-gray-700 mb-1">CRO</Text>
                            <TextInput
                                className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                value={cro}
                                onChangeText={setCro}
                                placeholder="SP 12345"
                            />
                        </View>
                    )}

                    {/* Save Button */}
                    <TouchableOpacity
                        className={`flex-row items-center justify-center py-4 rounded-xl mt-2 ${saving ? 'bg-[#a03f3d]/60' : 'bg-[#a03f3d]'}`}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <>
                                <Save size={18} color="white" />
                                <Text className="text-white font-bold ml-2">Salvar</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
