import { useState, useEffect } from 'react';
import { Save, Building2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PJSourcesManager } from './PJSourcesManager';
import { incomeTaxService } from '@/services/incomeTaxService';
import type { FiscalProfile, PJSource, FiscalProfileFormData, TaxRegime } from '@/types/incomeTax';
import { toast } from 'sonner';

interface FiscalSettingsTabProps {
  fiscalProfile: FiscalProfile | null;
  pjSources: PJSource[];
  onProfileUpdated: (profile: FiscalProfile) => void;
  onPJSourcesUpdated: () => void;
}

// CPF mask
const applyCPFMask = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

// CNPJ mask
const applyCNPJMask = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
};

// CEP mask
const applyCEPMask = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export function FiscalSettingsTab({
  fiscalProfile,
  pjSources,
  onProfileUpdated,
  onPJSourcesUpdated,
}: FiscalSettingsTabProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FiscalProfileFormData>({
    pf_enabled: false,
    pf_cpf: '',
    pf_cro: '',
    pf_address: '',
    pf_city: '',
    pf_state: '',
    pf_zip_code: '',
    pf_uses_carne_leao: false,
    pj_enabled: false,
    pj_cnpj: '',
    pj_razao_social: '',
    pj_nome_fantasia: '',
    pj_regime_tributario: '',
    pj_cnae: '',
  });

  // Load profile data into form
  useEffect(() => {
    if (fiscalProfile) {
      setFormData({
        pf_enabled: fiscalProfile.pf_enabled,
        pf_cpf: fiscalProfile.pf_cpf || '',
        pf_cro: fiscalProfile.pf_cro || '',
        pf_address: fiscalProfile.pf_address || '',
        pf_city: fiscalProfile.pf_city || '',
        pf_state: fiscalProfile.pf_state || '',
        pf_zip_code: fiscalProfile.pf_zip_code || '',
        pf_uses_carne_leao: fiscalProfile.pf_uses_carne_leao,
        pj_enabled: fiscalProfile.pj_enabled,
        pj_cnpj: fiscalProfile.pj_cnpj || '',
        pj_razao_social: fiscalProfile.pj_razao_social || '',
        pj_nome_fantasia: fiscalProfile.pj_nome_fantasia || '',
        pj_regime_tributario: fiscalProfile.pj_regime_tributario || '',
        pj_cnae: fiscalProfile.pj_cnae || '',
      });
    }
  }, [fiscalProfile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const profile = await incomeTaxService.saveFiscalProfile(formData);
      onProfileUpdated(profile);
    } catch (error) {
      console.error('Error saving fiscal profile:', error);
      toast.error('Erro ao salvar perfil fiscal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* PF Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-teal-600" />
              <CardTitle>Pessoa Fisica (PF)</CardTitle>
            </div>
            <Switch
              checked={formData.pf_enabled}
              onCheckedChange={(checked) => setFormData({ ...formData, pf_enabled: checked })}
            />
          </div>
          <CardDescription>
            Dados do profissional para declaracao como pessoa fisica
          </CardDescription>
        </CardHeader>

        {formData.pf_enabled && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pf_cpf">CPF</Label>
                <Input
                  id="pf_cpf"
                  placeholder="000.000.000-00"
                  value={formData.pf_cpf}
                  onChange={(e) => setFormData({ ...formData, pf_cpf: applyCPFMask(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pf_cro">CRO</Label>
                <Input
                  id="pf_cro"
                  placeholder="CRO-SP 12345"
                  value={formData.pf_cro}
                  onChange={(e) => setFormData({ ...formData, pf_cro: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pf_address">Endereco Profissional</Label>
              <Textarea
                id="pf_address"
                placeholder="Rua, numero, complemento"
                value={formData.pf_address}
                onChange={(e) => setFormData({ ...formData, pf_address: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pf_city">Cidade</Label>
                <Input
                  id="pf_city"
                  placeholder="Cidade"
                  value={formData.pf_city}
                  onChange={(e) => setFormData({ ...formData, pf_city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pf_state">Estado</Label>
                <Select
                  value={formData.pf_state}
                  onValueChange={(value) => setFormData({ ...formData, pf_state: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRAZILIAN_STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pf_zip_code">CEP</Label>
                <Input
                  id="pf_zip_code"
                  placeholder="00000-000"
                  value={formData.pf_zip_code}
                  onChange={(e) => setFormData({ ...formData, pf_zip_code: applyCEPMask(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <Label htmlFor="pf_carne_leao" className="text-base">Utiliza Carne-Leao</Label>
                <p className="text-sm text-muted-foreground">
                  Marque se voce recolhe IR mensalmente via carne-leao
                </p>
              </div>
              <Switch
                id="pf_carne_leao"
                checked={formData.pf_uses_carne_leao}
                onCheckedChange={(checked) => setFormData({ ...formData, pf_uses_carne_leao: checked })}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* PJ Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-teal-600" />
              <CardTitle>Pessoa Juridica (PJ)</CardTitle>
            </div>
            <Switch
              checked={formData.pj_enabled}
              onCheckedChange={(checked) => setFormData({ ...formData, pj_enabled: checked })}
            />
          </div>
          <CardDescription>
            Dados da empresa para declaracao como pessoa juridica
          </CardDescription>
        </CardHeader>

        {formData.pj_enabled && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pj_cnpj">CNPJ</Label>
                <Input
                  id="pj_cnpj"
                  placeholder="00.000.000/0000-00"
                  value={formData.pj_cnpj}
                  onChange={(e) => setFormData({ ...formData, pj_cnpj: applyCNPJMask(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pj_cnae">CNAE</Label>
                <Input
                  id="pj_cnae"
                  placeholder="8630-5/04"
                  value={formData.pj_cnae}
                  onChange={(e) => setFormData({ ...formData, pj_cnae: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pj_razao_social">Razao Social</Label>
              <Input
                id="pj_razao_social"
                placeholder="Nome empresarial completo"
                value={formData.pj_razao_social}
                onChange={(e) => setFormData({ ...formData, pj_razao_social: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pj_nome_fantasia">Nome Fantasia</Label>
              <Input
                id="pj_nome_fantasia"
                placeholder="Nome comercial"
                value={formData.pj_nome_fantasia}
                onChange={(e) => setFormData({ ...formData, pj_nome_fantasia: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pj_regime">Regime Tributario</Label>
              <Select
                value={formData.pj_regime_tributario}
                onValueChange={(value) => setFormData({ ...formData, pj_regime_tributario: value as TaxRegime })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o regime" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simples">Simples Nacional</SelectItem>
                  <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                  <SelectItem value="lucro_real">Lucro Real</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        )}
      </Card>

      {/* PJ Sources (Convenios) */}
      <PJSourcesManager
        sources={pjSources}
        onUpdated={onPJSourcesUpdated}
      />

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-teal-600 hover:bg-teal-700"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Configuracoes'}
        </Button>
      </div>
    </div>
  );
}
