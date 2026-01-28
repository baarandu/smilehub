import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Building2, Save, Users, MapPin, Phone, Mail } from 'lucide-react-native';
import { profileService } from '../../src/services/profile';
import { locationsService, type Location } from '../../src/services/locations';
import { useClinic } from '../../src/contexts/ClinicContext';
import { TeamManagementModal } from '../../src/components/TeamManagementModal';
import { LocationsModal } from '../../src/components/dashboard/LocationsModal';

const BRAZILIAN_STATES = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export default function ClinicSettings() {
    const router = useRouter();
    const { isAdmin } = useClinic();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Clinic info
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');

    const [showTeamModal, setShowTeamModal] = useState(false);

    // Locations
    const [locations, setLocations] = useState<Location[]>([]);
    const [showLocationsModal, setShowLocationsModal] = useState(false);
    const [showLocationForm, setShowLocationForm] = useState(false);
    const [locationForm, setLocationForm] = useState({ name: '', address: '' });
    const [editingLocation, setEditingLocation] = useState<Location | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const info = await profileService.getClinicInfo();
            setName(info.clinicName || '');
            setAddress(info.address || '');
            setCity(info.city || '');
            setState(info.state || '');
            setPhone(info.phone || '');
            setEmail(info.email || '');
        } catch (error) {
            console.error('Error loading clinic info:', error);
            Alert.alert('Erro', 'Não foi possível carregar as informações.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Erro', 'O nome da clínica é obrigatório.');
            return;
        }

        try {
            setSaving(true);
            await profileService.updateClinicInfo({
                name: name.trim(),
                address: address.trim() || undefined,
                city: city.trim() || undefined,
                state: state.trim() || undefined,
                phone: phone.trim() || undefined,
                email: email.trim() || undefined,
            });
            Alert.alert('Sucesso', 'Informações da clínica atualizadas!');
        } catch (error) {
            console.error('Error updating clinic info:', error);
            Alert.alert('Erro', 'Falha ao salvar as informações.');
        } finally {
            setSaving(false);
        }
    };

    // Locations handlers
    const loadLocations = async () => {
        try {
            const data = await locationsService.getAll();
            setLocations(data);
        } catch (error) {
            console.error('Error loading locations:', error);
        }
    };

    const handleOpenLocations = () => {
        loadLocations();
        setShowLocationsModal(true);
    };

    const handleAddLocation = () => {
        setLocationForm({ name: '', address: '' });
        setEditingLocation(null);
        setShowLocationForm(true);
    };

    const handleEditLocation = (location: Location) => {
        setLocationForm({ name: location.name, address: location.address || '' });
        setEditingLocation(location);
        setShowLocationForm(true);
    };

    const handleDeleteLocation = (location: Location) => {
        Alert.alert('Excluir Local', `Tem certeza que deseja excluir "${location.name}"?`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Excluir', style: 'destructive', onPress: async () => {
                    try {
                        await locationsService.delete(location.id);
                        loadLocations();
                    } catch (error) {
                        Alert.alert('Erro', 'Não foi possível excluir o local');
                    }
                }
            }
        ]);
    };

    const handleSaveLocation = async () => {
        if (!locationForm.name.trim()) {
            Alert.alert('Erro', 'Nome é obrigatório');
            return;
        }
        try {
            if (editingLocation) {
                await locationsService.update(editingLocation.id, { name: locationForm.name, address: locationForm.address || null });
            } else {
                await locationsService.create({ name: locationForm.name, address: locationForm.address || null });
            }
            setShowLocationForm(false);
            loadLocations();
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível salvar o local');
        }
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
                <ActivityIndicator size="large" color="#b94a48" />
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
                {/* Clinic Info Section */}
                <View className="bg-white p-6 rounded-2xl border border-gray-100 mb-6">
                    <View className="flex-row items-center gap-2 mb-4">
                        <Building2 size={20} color="#a03f3d" />
                        <Text className="text-gray-900 font-semibold text-base">Informações da Clínica</Text>
                    </View>

                    {/* Name */}
                    <View className="mb-4">
                        <Text className="text-gray-600 text-sm mb-1">Nome da Clínica *</Text>
                        <TextInput
                            value={name}
                            onChangeText={setName}
                            placeholder="Ex: Clínica Sorriso"
                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                        />
                    </View>

                    {/* Address */}
                    <View className="mb-4">
                        <Text className="text-gray-600 text-sm mb-1">Endereço</Text>
                        <TextInput
                            value={address}
                            onChangeText={setAddress}
                            placeholder="Ex: Rua das Flores, 123"
                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                        />
                    </View>

                    {/* City and State */}
                    <View className="flex-row gap-3 mb-4">
                        <View className="flex-1">
                            <Text className="text-gray-600 text-sm mb-1">Cidade</Text>
                            <TextInput
                                value={city}
                                onChangeText={setCity}
                                placeholder="Ex: São Paulo"
                                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                            />
                        </View>
                        <View className="w-24">
                            <Text className="text-gray-600 text-sm mb-1">Estado</Text>
                            <TextInput
                                value={state}
                                onChangeText={(text) => setState(text.toUpperCase().slice(0, 2))}
                                placeholder="SP"
                                maxLength={2}
                                autoCapitalize="characters"
                                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-center"
                            />
                        </View>
                    </View>

                    {/* Phone */}
                    <View className="mb-4">
                        <View className="flex-row items-center gap-1 mb-1">
                            <Phone size={14} color="#6B7280" />
                            <Text className="text-gray-600 text-sm">Telefone/WhatsApp</Text>
                        </View>
                        <TextInput
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="(11) 99999-9999"
                            keyboardType="phone-pad"
                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                        />
                    </View>

                    {/* Email */}
                    <View className="mb-4">
                        <View className="flex-row items-center gap-1 mb-1">
                            <Mail size={14} color="#6B7280" />
                            <Text className="text-gray-600 text-sm">Email</Text>
                        </View>
                        <TextInput
                            value={email}
                            onChangeText={setEmail}
                            placeholder="contato@clinica.com"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                        />
                    </View>

                    {/* Save Button */}
                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={saving}
                        className="bg-[#a03f3d] py-3 rounded-xl flex-row items-center justify-center gap-2"
                    >
                        {saving ? (
                            <ActivityIndicator size={20} color="white" />
                        ) : (
                            <>
                                <Save size={20} color="white" />
                                <Text className="text-white font-bold">Salvar</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Locations Management Section */}
                <TouchableOpacity
                    className="bg-white p-4 rounded-2xl border border-gray-100 flex-row items-center justify-between mb-4"
                    onPress={handleOpenLocations}
                >
                    <View className="flex-row items-center gap-3">
                        <View className="w-10 h-10 bg-emerald-50 rounded-full items-center justify-center">
                            <MapPin size={20} color="#10b981" />
                        </View>
                        <View>
                            <Text className="text-gray-900 font-semibold">Locais de Atendimento</Text>
                            <Text className="text-gray-500 text-sm">Gerenciar endereços</Text>
                        </View>
                    </View>
                    <ChevronLeft size={20} color="#9ca3af" style={{ transform: [{ rotate: '180deg' }] }} />
                </TouchableOpacity>

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

                <View className="h-8" />
            </ScrollView>

            <LocationsModal
                visible={showLocationsModal}
                onClose={() => setShowLocationsModal(false)}
                locations={locations}
                showForm={showLocationForm}
                setShowForm={setShowLocationForm}
                form={locationForm}
                setForm={setLocationForm}
                editingLocation={editingLocation}
                onAdd={handleAddLocation}
                onEdit={handleEditLocation}
                onDelete={handleDeleteLocation}
                onSave={handleSaveLocation}
            />

            <TeamManagementModal
                visible={showTeamModal}
                onClose={() => setShowTeamModal(false)}
            />
        </SafeAreaView>
    );
}
