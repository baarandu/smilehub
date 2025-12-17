import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PatientFormData } from '@/types/database';

interface PatientFormProps {
  initialData?: Partial<PatientFormData>;
  onSubmit: (data: PatientFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

const emptyForm: PatientFormData = {
  name: '',
  phone: '',
  email: '',
  birthDate: '',
  cpf: '',
  rg: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  occupation: '',
  emergencyContact: '',
  emergencyPhone: '',
  healthInsurance: '',
  healthInsuranceNumber: '',
  allergies: '',
  medications: '',
  medicalHistory: '',
  notes: '',
};

export function PatientForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
  submitLabel = 'Salvar',
}: PatientFormProps) {
  const [form, setForm] = useState<PatientFormData>({ ...emptyForm, ...initialData });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
  };

  const updateField = (field: keyof PatientFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
    }
    return value;
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .slice(0, 14);
  };

  const formatZipCode = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personal">Pessoal</TabsTrigger>
          <TabsTrigger value="contact">Contato</TabsTrigger>
          <TabsTrigger value="health">Saúde</TabsTrigger>
          <TabsTrigger value="notes">Observações</TabsTrigger>
        </TabsList>

        {/* Personal Tab */}
        <TabsContent value="personal" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Maria da Silva"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthDate">Data de Nascimento</Label>
              <Input
                id="birthDate"
                type="date"
                value={form.birthDate}
                onChange={(e) => updateField('birthDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                value={form.cpf}
                onChange={(e) => updateField('cpf', formatCPF(e.target.value))}
                placeholder="000.000.000-00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rg">RG</Label>
              <Input
                id="rg"
                value={form.rg}
                onChange={(e) => updateField('rg', e.target.value)}
                placeholder="00.000.000-0"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="occupation">Profissão</Label>
              <Input
                id="occupation"
                value={form.occupation}
                onChange={(e) => updateField('occupation', e.target.value)}
                placeholder="Ex: Engenheiro(a)"
              />
            </div>
          </div>
        </TabsContent>

        {/* Contact Tab */}
        <TabsContent value="contact" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => updateField('phone', formatPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
                placeholder="Rua, número, complemento"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => updateField('city', e.target.value)}
                placeholder="São Paulo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <Input
                id="state"
                value={form.state}
                onChange={(e) => updateField('state', e.target.value.toUpperCase().slice(0, 2))}
                placeholder="SP"
                maxLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zipCode">CEP</Label>
              <Input
                id="zipCode"
                value={form.zipCode}
                onChange={(e) => updateField('zipCode', formatZipCode(e.target.value))}
                placeholder="00000-000"
              />
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium mb-4">Contato de Emergência</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyContact">Nome</Label>
                <Input
                  id="emergencyContact"
                  value={form.emergencyContact}
                  onChange={(e) => updateField('emergencyContact', e.target.value)}
                  placeholder="Nome do contato"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyPhone">Telefone</Label>
                <Input
                  id="emergencyPhone"
                  value={form.emergencyPhone}
                  onChange={(e) => updateField('emergencyPhone', formatPhone(e.target.value))}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Health Tab */}
        <TabsContent value="health" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="healthInsurance">Convênio</Label>
              <Input
                id="healthInsurance"
                value={form.healthInsurance}
                onChange={(e) => updateField('healthInsurance', e.target.value)}
                placeholder="Nome do convênio"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="healthInsuranceNumber">Número da Carteirinha</Label>
              <Input
                id="healthInsuranceNumber"
                value={form.healthInsuranceNumber}
                onChange={(e) => updateField('healthInsuranceNumber', e.target.value)}
                placeholder="Número do plano"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="allergies">Alergias</Label>
            <Textarea
              id="allergies"
              value={form.allergies}
              onChange={(e) => updateField('allergies', e.target.value)}
              placeholder="Liste alergias conhecidas (medicamentos, látex, etc.)"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="medications">Medicamentos em uso</Label>
            <Textarea
              id="medications"
              value={form.medications}
              onChange={(e) => updateField('medications', e.target.value)}
              placeholder="Liste medicamentos que o paciente utiliza regularmente"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="medicalHistory">Histórico Médico</Label>
            <Textarea
              id="medicalHistory"
              value={form.medicalHistory}
              onChange={(e) => updateField('medicalHistory', e.target.value)}
              placeholder="Doenças pré-existentes, cirurgias anteriores, etc."
              rows={4}
            />
          </div>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Observações gerais</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Outras informações relevantes sobre o paciente"
              rows={8}
            />
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex gap-3 pt-4 border-t">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" className="flex-1" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}



