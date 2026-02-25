import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Shield, Monitor, LogOut, AlertTriangle } from 'lucide-react-native';
import { supabase } from '../../src/lib/supabase';

export default function SessionManagementPage() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [session, setSession] = useState<{
    email: string | undefined;
    lastSignIn: string | undefined;
    userId: string | undefined;
  } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSession({
          email: data.session.user.email,
          lastSignIn: data.session.user.last_sign_in_at,
          userId: data.session.user.id,
        });
      }
      setLoaded(true);
    });
  }, []);

  const handleGlobalSignOut = () => {
    Alert.alert(
      'Encerrar todas as sessões?',
      'Isso vai desconectar você de todos os dispositivos, incluindo este. Você será redirecionado para a tela de login.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim, encerrar todas',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            try {
              const { error } = await supabase.auth.signOut({ scope: 'global' });
              if (error) throw error;
              Alert.alert('Sucesso', 'Todas as sessões foram encerradas');
            } catch (error) {
              console.error('Erro ao encerrar sessões:', error);
              Alert.alert('Erro', 'Erro ao encerrar sessões. Tente novamente.');
              setSigningOut(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center p-4 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ChevronLeft size={24} color="#374151" />
        </TouchableOpacity>
        <Shield size={24} color="#a03f3d" />
        <Text className="text-lg font-bold text-gray-900 ml-2">Gerenciamento de Sessões</Text>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Current Session */}
        <View className="bg-white p-5 rounded-xl border border-gray-100 mb-4">
          <View className="flex-row items-center gap-2 mb-4">
            <Monitor size={20} color="#16A34A" />
            <Text className="text-base font-semibold text-gray-900">Sessão Atual</Text>
          </View>

          {loaded && session ? (
            <View className="gap-3">
              <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
                <Text className="text-sm text-gray-500">E-mail</Text>
                <Text className="text-sm font-medium text-gray-900">{session.email}</Text>
              </View>
              <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
                <Text className="text-sm text-gray-500">Último login</Text>
                <Text className="text-sm font-medium text-gray-900">
                  {session.lastSignIn
                    ? new Date(session.lastSignIn).toLocaleString('pt-BR')
                    : 'Não disponível'}
                </Text>
              </View>
              <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
                <Text className="text-sm text-gray-500">ID do usuário</Text>
                <Text className="text-sm font-mono text-gray-400">{session.userId?.slice(0, 8)}...</Text>
              </View>
              <View className="flex-row items-center justify-between py-2">
                <Text className="text-sm text-gray-500">Status</Text>
                <View className="flex-row items-center gap-1.5 bg-green-50 px-2.5 py-0.5 rounded-full">
                  <View className="w-2 h-2 bg-green-500 rounded-full" />
                  <Text className="text-sm font-medium text-green-700">Ativa</Text>
                </View>
              </View>
            </View>
          ) : loaded ? (
            <Text className="text-sm text-gray-500">Nenhuma sessão ativa encontrada.</Text>
          ) : (
            <ActivityIndicator size="small" color="#a03f3d" />
          )}
        </View>

        {/* Sign Out All */}
        <View className="bg-white p-5 rounded-xl border border-red-200">
          <View className="flex-row items-center gap-2 mb-2">
            <AlertTriangle size={20} color="#B91C1C" />
            <Text className="text-base font-semibold text-red-700">Encerrar Todas as Sessões</Text>
          </View>
          <Text className="text-sm text-gray-500 mb-4">
            Encerra sua sessão em todos os dispositivos, incluindo este. Você precisará fazer login novamente.
          </Text>
          <TouchableOpacity
            onPress={handleGlobalSignOut}
            disabled={signingOut}
            className={`flex-row items-center justify-center gap-2 py-3 rounded-lg ${signingOut ? 'bg-red-300' : 'bg-red-600'}`}
          >
            <LogOut size={18} color="#fff" />
            <Text className="text-white font-medium">{signingOut ? 'Encerrando...' : 'Encerrar todas as sessões'}</Text>
          </TouchableOpacity>
        </View>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
