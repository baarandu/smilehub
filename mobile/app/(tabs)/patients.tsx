import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Phone, Mail, ChevronRight, Users } from 'lucide-react-native';
import { patientsService } from '../../src/services/patients';
import type { Patient } from '../../src/types/database';

export default function Patients() {
    const [loading, setLoading] = useState(true);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadPatients();
    }, []);

    const loadPatients = async () => {
        try {
            setLoading(true);
            const data = await patientsService.getAll();
            setPatients(data);
        } catch (error) {
            console.error('Error loading patients:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredPatients = patients.filter((p) => {
        if (!search) return true;
        const query = search.toLowerCase();
        return (
            p.name.toLowerCase().includes(query) ||
            p.phone.includes(query) ||
            (p.email && p.email.toLowerCase().includes(query))
        );
    });

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
                <ActivityIndicator size="large" color="#0D9488" />
                <Text className="text-gray-500 mt-4">Carregando pacientes...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <ScrollView className="px-4 py-6">
                {/* Header */}
                <View className="mb-6">
                    <Text className="text-2xl font-bold text-gray-900">Pacientes</Text>
                    <Text className="text-gray-500 mt-1">
                        {patients.length} pacientes cadastrados
                    </Text>
                </View>

                {/* Search */}
                <View className="bg-white rounded-xl border border-gray-200 flex-row items-center px-4 mb-6">
                    <Search size={20} color="#9CA3AF" />
                    <TextInput
                        className="flex-1 py-3 px-3 text-gray-900"
                        placeholder="Buscar por nome, telefone..."
                        placeholderTextColor="#9CA3AF"
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>

                {/* Patients List */}
                {filteredPatients.length === 0 ? (
                    <View className="bg-white rounded-xl p-12 items-center">
                        <Users size={48} color="#D1D5DB" />
                        <Text className="text-gray-400 mt-4">
                            {search ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
                        </Text>
                    </View>
                ) : (
                    <View className="gap-3">
                        {filteredPatients.map((patient) => (
                            <TouchableOpacity
                                key={patient.id}
                                className="bg-white rounded-xl p-4 border border-gray-100"
                                activeOpacity={0.7}
                            >
                                <View className="flex-row items-center gap-4">
                                    <View className="w-14 h-14 rounded-xl bg-teal-500 items-center justify-center">
                                        <Text className="text-white font-bold text-lg">
                                            {getInitials(patient.name)}
                                        </Text>
                                    </View>
                                    <View className="flex-1">
                                        <Text className="font-semibold text-gray-900 text-base">
                                            {patient.name}
                                        </Text>
                                        <View className="flex-row items-center gap-2 mt-1">
                                            <Phone size={14} color="#9CA3AF" />
                                            <Text className="text-gray-500 text-sm">{patient.phone}</Text>
                                        </View>
                                        {patient.email && (
                                            <View className="flex-row items-center gap-2 mt-1">
                                                <Mail size={14} color="#9CA3AF" />
                                                <Text className="text-gray-500 text-sm">{patient.email}</Text>
                                            </View>
                                        )}
                                    </View>
                                    <ChevronRight size={20} color="#9CA3AF" />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <View className="h-6" />
            </ScrollView>
        </SafeAreaView>
    );
}
