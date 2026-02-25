import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Upload, FileSpreadsheet, Users, Stethoscope, DollarSign, Info, ExternalLink } from 'lucide-react-native';

export default function DataMigrationScreen() {
  const router = useRouter();

  const migrationTypes = [
    {
      icon: Users,
      title: 'Pacientes',
      description: 'Importe nome, telefone, email, CPF, endereço e dados médicos.',
      color: '#3B82F6',
      bgColor: 'bg-blue-50',
    },
    {
      icon: Stethoscope,
      title: 'Procedimentos',
      description: 'Importe histórico de procedimentos com paciente, data, descrição e valor.',
      color: '#10B981',
      bgColor: 'bg-green-50',
    },
    {
      icon: DollarSign,
      title: 'Financeiro',
      description: 'Importe receitas e despesas com categoria, data e método de pagamento.',
      color: '#8B5CF6',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center p-4 border-b border-gray-200 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-xl font-bold text-gray-900">Migração de Dados</Text>
          <Text className="text-gray-500 text-sm">Importe dados de outros sistemas</Text>
        </View>
      </View>

      <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Info Card */}
        <View className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex-row gap-3">
          <Info size={20} color="#3B82F6" />
          <View className="flex-1">
            <Text className="text-blue-800 font-medium text-sm mb-1">Como funciona</Text>
            <Text className="text-blue-700 text-xs leading-5">
              A migração de dados permite importar informações de outros sistemas odontológicos.
              Acesse a versão web para realizar a importação com suporte a arquivos CSV, Excel (.xlsx) e JSON.
            </Text>
          </View>
        </View>

        {/* Supported Formats */}
        <Text className="text-gray-400 text-xs font-bold uppercase ml-1 mb-3">Formatos Suportados</Text>
        <View className="flex-row gap-3 mb-6">
          {['CSV', 'Excel (.xlsx)', 'JSON'].map(format => (
            <View key={format} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex-1 items-center">
              <FileSpreadsheet size={20} color="#6B7280" />
              <Text className="text-xs text-gray-700 mt-1.5 font-medium">{format}</Text>
            </View>
          ))}
        </View>

        {/* Migration Types */}
        <Text className="text-gray-400 text-xs font-bold uppercase ml-1 mb-3">Tipos de Importação</Text>
        {migrationTypes.map((type, idx) => (
          <View key={idx} className="bg-white rounded-xl p-4 border border-gray-100 mb-3 flex-row items-start gap-3">
            <View className={`w-10 h-10 ${type.bgColor} rounded-xl items-center justify-center`}>
              <type.icon size={20} color={type.color} />
            </View>
            <View className="flex-1">
              <Text className="text-gray-900 font-semibold">{type.title}</Text>
              <Text className="text-gray-500 text-xs mt-1 leading-4">{type.description}</Text>
            </View>
          </View>
        ))}

        {/* Web Access */}
        <View className="bg-[#fef2f2] border border-[#fecaca] rounded-xl p-4 mt-4">
          <View className="flex-row items-center gap-2 mb-2">
            <Upload size={18} color="#b94a48" />
            <Text className="text-[#a03f3d] font-semibold">Importação via Web</Text>
          </View>
          <Text className="text-[#8b3634] text-xs leading-5 mb-3">
            A importação de dados é realizada pela versão web do sistema, que oferece upload de arquivos,
            mapeamento de campos e validação de dados antes da importação.
          </Text>
          <TouchableOpacity
            onPress={() => Linking.openURL('https://app.organizaodonto.com.br/configuracoes/migracao')}
            className="flex-row items-center gap-2"
          >
            <ExternalLink size={14} color="#b94a48" />
            <Text className="text-[#b94a48] text-xs font-medium">Acessar versão web</Text>
          </TouchableOpacity>
        </View>

        {/* Steps Guide */}
        <Text className="text-gray-400 text-xs font-bold uppercase ml-1 mt-6 mb-3">Passo a Passo</Text>
        {[
          { step: '1', title: 'Exporte os dados', desc: 'Do seu sistema atual, exporte os dados em CSV, Excel ou JSON.' },
          { step: '2', title: 'Acesse a versão web', desc: 'Na versão web, vá em Configurações > Migração de Dados.' },
          { step: '3', title: 'Faça o upload', desc: 'Selecione o tipo de dados e faça o upload do arquivo.' },
          { step: '4', title: 'Mapeie os campos', desc: 'O sistema mapeia automaticamente os campos. Revise e ajuste se necessário.' },
          { step: '5', title: 'Importe', desc: 'Valide os dados e confirme a importação. Os dados aparecerão no app.' },
        ].map(item => (
          <View key={item.step} className="flex-row gap-3 mb-3">
            <View className="w-7 h-7 bg-[#b94a48] rounded-full items-center justify-center">
              <Text className="text-white text-xs font-bold">{item.step}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-gray-900 font-medium text-sm">{item.title}</Text>
              <Text className="text-gray-500 text-xs mt-0.5">{item.desc}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
