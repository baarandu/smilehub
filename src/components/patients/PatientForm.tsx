import { useState, useMemo } from 'react';
import { Loader2, AlertTriangle, User, Baby } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PatientFormData } from '@/types/database';
import { usePatientSearch } from '@/hooks/usePatients';

interface PatientFormProps {
  initialData?: Partial<PatientFormData>;
  onSubmit: (data: PatientFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
  isEditing?: boolean;
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
  patientType: 'adult',
  gender: '',
  birthplace: '',
  school: '',
  schoolGrade: '',
  motherName: '',
  motherOccupation: '',
  motherPhone: '',
  fatherName: '',
  fatherOccupation: '',
  fatherPhone: '',
  legalGuardian: '',
  hasSiblings: false,
  siblingsCount: '',
  siblingsAges: '',
};

export function PatientForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
  submitLabel = 'Salvar',
  isEditing = false,
}: PatientFormProps) {
  const [form, setForm] = useState<PatientFormData>({ ...emptyForm, ...initialData });

  // Busca pacientes existentes pelo nome (apenas no cadastro, não na edição)
  const { data: existingPatients } = usePatientSearch(isEditing ? '' : form.name);
  const showDuplicateWarning = !isEditing && existingPatients && existingPatients.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // For child patients, auto-fill phone from parent phone
    if (form.patientType === 'child') {
      const parentPhone = form.motherPhone || form.fatherPhone;
      await onSubmit({ ...form, phone: parentPhone });
    } else {
      await onSubmit(form);
    }
  };

  const updateField = (field: keyof PatientFormData, value: string | boolean) => {
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

  const calculatedAge = useMemo(() => {
    if (!form.birthDate) return '';
    const birth = new Date(form.birthDate);
    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    if (months < 0 || (months === 0 && today.getDate() < birth.getDate())) {
      years--;
      months += 12;
    }
    if (today.getDate() < birth.getDate()) {
      months--;
    }
    if (years < 1) return `${months} ${months === 1 ? 'mes' : 'meses'}`;
    if (years < 3) return `${years} ${years === 1 ? 'ano' : 'anos'} e ${months} ${months === 1 ? 'mes' : 'meses'}`;
    return `${years} anos`;
  }, [form.birthDate]);

  const isChild = form.patientType === 'child';

  const DuplicateWarning = () => {
    if (!showDuplicateWarning) return null;
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mt-2">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-amber-800">
              Paciente(s) com nome parecido encontrado(s):
            </p>
            <ul className="mt-1 space-y-1">
              {existingPatients!.slice(0, 5).map((patient) => (
                <li key={patient.id} className="text-amber-700">
                  <span className="font-medium">{patient.name}</span>
                  {patient.phone && (
                    <span className="text-amber-600"> - Tel: {patient.phone}</span>
                  )}
                  {patient.cpf && (
                    <span className="text-amber-600"> - CPF: {patient.cpf}</span>
                  )}
                </li>
              ))}
            </ul>
            <p className="text-amber-600 mt-2 text-xs">
              Verifique se não é o mesmo paciente antes de continuar.
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-md text-sm border border-blue-100">
        Campos marcados com <strong>*</strong> são obrigatórios
        {isChild
          ? ' (Nome Completo e Telefone de pelo menos um responsável).'
          : ' (Nome Completo e Telefone).'}
      </div>

      {/* Top-level patient type selector */}
      <div className="flex gap-2 p-1 bg-muted rounded-lg">
        <button
          type="button"
          onClick={() => updateField('patientType', 'adult')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
            !isChild
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <User className="w-4 h-4" />
          Adulto
        </button>
        <button
          type="button"
          onClick={() => updateField('patientType', 'child')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
            isChild
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Baby className="w-4 h-4" />
          Criança
        </button>
      </div>

      {/* Adult form */}
      {!isChild && (
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personal">Pessoal</TabsTrigger>
            <TabsTrigger value="contact">Contato</TabsTrigger>
            <TabsTrigger value="health">Plano de Saúde</TabsTrigger>
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
                <DuplicateWarning />
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
          </TabsContent>
        </Tabs>
      )}

      {/* Child form */}
      {isChild && (
        <Tabs defaultValue="identification" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="identification">Identificação</TabsTrigger>
            <TabsTrigger value="parents">Pais e Responsável</TabsTrigger>
            <TabsTrigger value="health-child">Plano de Saúde</TabsTrigger>
          </TabsList>

          {/* Identification Tab */}
          <TabsContent value="identification" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="child-name">Nome completo *</Label>
                <Input
                  id="child-name"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Nome da criança"
                  required
                />
                <DuplicateWarning />
              </div>
              <div className="space-y-2">
                <Label htmlFor="child-birthDate">Data de Nascimento</Label>
                <Input
                  id="child-birthDate"
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => updateField('birthDate', e.target.value)}
                />
                {calculatedAge && (
                  <p className="text-sm text-muted-foreground">
                    Idade: {calculatedAge}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="child-gender">Sexo</Label>
                <Select
                  value={form.gender}
                  onValueChange={(value) => updateField('gender', value)}
                >
                  <SelectTrigger id="child-gender">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="feminino">Feminino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="child-cpf">CPF</Label>
                <Input
                  id="child-cpf"
                  value={form.cpf}
                  onChange={(e) => updateField('cpf', formatCPF(e.target.value))}
                  placeholder="000.000.000-00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="child-birthplace">Naturalidade</Label>
                <Input
                  id="child-birthplace"
                  value={form.birthplace}
                  onChange={(e) => updateField('birthplace', e.target.value)}
                  placeholder="Ex: São Paulo - SP"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="child-address">Endereço completo</Label>
                <Input
                  id="child-address"
                  value={form.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="Rua, número, bairro, cidade - UF"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="child-school">Escola / Creche</Label>
                <Input
                  id="child-school"
                  value={form.school}
                  onChange={(e) => updateField('school', e.target.value)}
                  placeholder="Nome da escola ou creche"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="child-schoolGrade">Série / Ano escolar</Label>
                <Input
                  id="child-schoolGrade"
                  value={form.schoolGrade}
                  onChange={(e) => updateField('schoolGrade', e.target.value)}
                  placeholder="Ex: 3º ano"
                />
              </div>
            </div>
          </TabsContent>

          {/* Parents Tab */}
          <TabsContent value="parents" className="space-y-4 mt-4">
            {/* Mother */}
            <div>
              <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">Mãe</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="motherName">Nome</Label>
                  <Input
                    id="motherName"
                    value={form.motherName}
                    onChange={(e) => updateField('motherName', e.target.value)}
                    placeholder="Nome da mãe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="motherOccupation">Profissão</Label>
                  <Input
                    id="motherOccupation"
                    value={form.motherOccupation}
                    onChange={(e) => updateField('motherOccupation', e.target.value)}
                    placeholder="Profissão da mãe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="motherPhone">Telefone {!form.fatherPhone && '*'}</Label>
                  <Input
                    id="motherPhone"
                    value={form.motherPhone}
                    onChange={(e) => updateField('motherPhone', formatPhone(e.target.value))}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>
            </div>

            {/* Father */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">Pai</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fatherName">Nome</Label>
                  <Input
                    id="fatherName"
                    value={form.fatherName}
                    onChange={(e) => updateField('fatherName', e.target.value)}
                    placeholder="Nome do pai"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fatherOccupation">Profissão</Label>
                  <Input
                    id="fatherOccupation"
                    value={form.fatherOccupation}
                    onChange={(e) => updateField('fatherOccupation', e.target.value)}
                    placeholder="Profissão do pai"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fatherPhone">Telefone {!form.motherPhone && '*'}</Label>
                  <Input
                    id="fatherPhone"
                    value={form.fatherPhone}
                    onChange={(e) => updateField('fatherPhone', formatPhone(e.target.value))}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>
            </div>

            {/* Legal Guardian */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">Responsável Legal</h4>
              <div className="space-y-2">
                <Label htmlFor="legalGuardian">Responsável legal (se diferente dos pais)</Label>
                <Input
                  id="legalGuardian"
                  value={form.legalGuardian}
                  onChange={(e) => updateField('legalGuardian', e.target.value)}
                  placeholder="Nome do responsável legal"
                />
              </div>
            </div>

            {/* Siblings */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">Irmãos</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Switch
                    id="hasSiblings"
                    checked={form.hasSiblings}
                    onCheckedChange={(checked) => updateField('hasSiblings', checked)}
                  />
                  <Label htmlFor="hasSiblings">Possui irmãos?</Label>
                </div>
                {form.hasSiblings && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="siblingsCount">Quantos irmãos?</Label>
                      <Input
                        id="siblingsCount"
                        value={form.siblingsCount}
                        onChange={(e) => updateField('siblingsCount', e.target.value)}
                        placeholder="Ex: 2"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="siblingsAges">Idade dos irmãos</Label>
                      <Input
                        id="siblingsAges"
                        value={form.siblingsAges}
                        onChange={(e) => updateField('siblingsAges', e.target.value)}
                        placeholder="Ex: 5 e 8 anos"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Health Tab (Child) */}
          <TabsContent value="health-child" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="child-healthInsurance">Convênio</Label>
                <Input
                  id="child-healthInsurance"
                  value={form.healthInsurance}
                  onChange={(e) => updateField('healthInsurance', e.target.value)}
                  placeholder="Nome do convênio"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="child-healthInsuranceNumber">Número da Carteirinha</Label>
                <Input
                  id="child-healthInsuranceNumber"
                  value={form.healthInsuranceNumber}
                  onChange={(e) => updateField('healthInsuranceNumber', e.target.value)}
                  placeholder="Número do plano"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}

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
