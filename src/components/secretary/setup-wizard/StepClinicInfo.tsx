import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Plus, Trash2, User } from 'lucide-react';
import type { WizardData } from './SetupWizard';

interface StepClinicInfoProps {
  data: WizardData;
  onUpdate: (partial: Partial<WizardData>) => void;
  onBack: () => void;
  onNext: () => void;
}

export function StepClinicInfo({ data, onUpdate, onBack, onNext }: StepClinicInfoProps) {
  const [profName, setProfName] = useState('');
  const [profTitle, setProfTitle] = useState('Dr.');
  const [profSpecialty, setProfSpecialty] = useState('');

  const handleAddProfessional = () => {
    if (!profName.trim()) return;
    onUpdate({
      professionals: [...data.professionals, {
        name: profName.trim(),
        title: profTitle,
        specialty: profSpecialty.trim(),
      }],
    });
    setProfName('');
    setProfTitle('Dr.');
    setProfSpecialty('');
  };

  const handleRemoveProfessional = (index: number) => {
    onUpdate({
      professionals: data.professionals.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Dados da Clínica</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Informações que a secretária usa para responder pacientes
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label className="text-sm font-medium">Telefone da Clínica</Label>
            <Input
              value={data.clinicPhone}
              onChange={(e) => onUpdate({ clinicPhone: e.target.value })}
              placeholder="(11) 3000-0000"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Endereço</Label>
            <Input
              value={data.clinicAddress}
              onChange={(e) => onUpdate({ clinicAddress: e.target.value })}
              placeholder="Rua Example, 123 - Bairro - Cidade/UF"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">E-mail</Label>
            <Input
              type="email"
              value={data.clinicEmail}
              onChange={(e) => onUpdate({ clinicEmail: e.target.value })}
              placeholder="contato@clinica.com"
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Professionals */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <Label className="text-sm font-medium">Profissionais</Label>
          <p className="text-xs text-muted-foreground">
            Adicione os dentistas que atendem na clínica. A secretária vai oferecer agendamento com eles.
          </p>

          {data.professionals.length > 0 && (
            <div className="space-y-2">
              {data.professionals.map((prof, idx) => (
                <div key={idx} className="flex items-center justify-between bg-muted/50 p-3 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{prof.title} {prof.name}</span>
                    {prof.specialty && (
                      <span className="text-xs text-muted-foreground">- {prof.specialty}</span>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleRemoveProfessional(idx)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
            <div className="grid grid-cols-[80px_1fr] gap-2">
              <div>
                <Label className="text-xs">Título</Label>
                <Select value={profTitle} onValueChange={setProfTitle}>
                  <SelectTrigger className="mt-1 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dr.">Dr.</SelectItem>
                    <SelectItem value="Dra.">Dra.</SelectItem>
                    <SelectItem value="Prof.">Prof.</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Nome</Label>
                <Input
                  value={profName}
                  onChange={(e) => setProfName(e.target.value)}
                  placeholder="Nome completo"
                  className="mt-1 h-9"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Especialidade (opcional)</Label>
              <Input
                value={profSpecialty}
                onChange={(e) => setProfSpecialty(e.target.value)}
                placeholder="Ex: Ortodontia, Implantes..."
                className="mt-1 h-9"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleAddProfessional}
              disabled={!profName.trim()}
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar Profissional
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={onNext}>
          Continuar
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
