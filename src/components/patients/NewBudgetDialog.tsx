
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { budgetsService } from '@/services/budgets';
import { locationsService, type Location } from '@/services/locations';
import { financialService } from '@/services/financial';
import { getShortToothId, calculateBudgetStatus, type ToothEntry } from '@/utils/budgetUtils';
import type { BudgetInsert, BudgetWithItems } from '@/types/database';
import { BudgetForm } from './budget/BudgetForm';
import { BudgetSummary } from './budget/BudgetSummary';
import { LocationsModal } from '@/components/profile/LocationsModal';
import { useClinic } from '@/contexts/ClinicContext';
import { usePatientTreatmentPlan, computeBudgetDiscount } from '@/hooks/usePatientTreatmentPlan';
import { supabase } from '@/lib/supabase';

interface NewBudgetDialogProps {
    patientId: string;
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    budget?: BudgetWithItems | null;
}

export function NewBudgetDialog({ patientId, open, onClose, onSuccess, budget }: NewBudgetDialogProps) {
    const { toast } = useToast();
    const { clinicId } = useClinic();
    const [saving, setSaving] = useState(false);

    // Form State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [locationRate, setLocationRate] = useState('');
    const [location, setLocation] = useState('');
    const [locations, setLocations] = useState<Location[]>([]);
    const [dentists, setDentists] = useState<{ id: string; name: string }[]>([]);
    const [responsibleDentistId, setResponsibleDentistId] = useState('');
    const [teethList, setTeethList] = useState<ToothEntry[]>([]);

    const [locationsModalOpen, setLocationsModalOpen] = useState(false);

    // Active treatment-plan subscription → automatic per-treatment discount
    const { subscription, usage } = usePatientTreatmentPlan(patientId);
    const { discountAmount, planName } = computeBudgetDiscount(teethList, subscription, usage);

    const isEditing = !!budget;

    // Reset form when opening or load existing budget
    // Reset form when opening or load existing budget
    useEffect(() => {
        if (open) {
            loadLocations();
            loadDentists();
            if (budget) {
                // Load existing budget for editing
                setDate(budget.date);
                try {
                    const parsed = JSON.parse(budget.notes || '{}');
                    if (parsed.teeth) {
                        setTeethList(parsed.teeth.map((t: ToothEntry) => ({
                            ...t,
                            status: t.status || 'pending',
                        })));
                    }
                    // Load location if available
                    if (parsed.location) {
                        setLocation(parsed.location);
                    }
                    setResponsibleDentistId(parsed.responsibleDentistId || budget.created_by || '');

                    // Load locationRate from notes or from budget column
                    const rate = parsed.locationRate || (budget as any).location_rate || 0;
                    if (rate > 0) {
                        setLocationRate(rate.toString());
                    } else {
                        setLocationRate('');
                    }
                } catch (e) {
                    setTeethList([]);
                    setLocationRate('');
                    setLocation('');
                    setResponsibleDentistId('');
                }
            } else {
                // Reset for new budget
                setDate(new Date().toISOString().split('T')[0]);
                setLocationRate('');
                setLocation('');
                setResponsibleDentistId('');
                setTeethList([]);
            }
        }
    }, [open, budget]);

    const loadLocations = async () => {
        try {
            const data = await locationsService.getAll();
            setLocations(data);
        } catch (error) {
            console.error('Error loading locations:', error);
        }
    };

    const loadDentists = async () => {
        if (!clinicId) return;
        try {
            const { data: clinicUsers, error: usersError } = await supabase
                .from('clinic_users')
                .select('user_id, role, roles')
                .eq('clinic_id', clinicId);
            if (usersError) throw usersError;

            const dentistUsers = (clinicUsers || [])
                .filter((u: any) => (u.roles || [u.role]).includes('dentist'));
            const userIds = dentistUsers.map((u: any) => u.user_id);
            if (userIds.length === 0) {
                setDentists([]);
                return;
            }

            const { data: profiles } = await supabase.rpc('get_profiles_for_users', { user_ids: userIds });
            const names = new Map<string, string>();
            (profiles || []).forEach((profile: any) => {
                names.set(profile.id, profile.full_name || profile.email || profile.id);
            });

            const dentistOptions = dentistUsers.map((u: any) => ({
                id: u.user_id,
                name: names.get(u.user_id) || `Usuário ${u.user_id.slice(0, 8)}`,
            }));

            setDentists(dentistOptions);

            if (budget) {
                let parsedResponsibleId: string | null = null;
                try {
                    parsedResponsibleId = JSON.parse(budget.notes || '{}')?.responsibleDentistId || null;
                } catch {
                    parsedResponsibleId = null;
                }
                const fallbackId = parsedResponsibleId || budget.created_by || '';
                setResponsibleDentistId(dentistOptions.some(d => d.id === fallbackId) ? fallbackId : '');
            } else {
                const { data: { user } } = await supabase.auth.getUser();
                if (user && dentistOptions.some(d => d.id === user.id)) {
                    setResponsibleDentistId(user.id);
                } else if (dentistOptions.length === 1) {
                    setResponsibleDentistId(dentistOptions[0].id);
                }
            }
        } catch (error) {
            console.error('Error loading dentists:', error);
            setDentists([]);
        }
    };

    const handleLocationsModalChange = (open: boolean) => {
        setLocationsModalOpen(open);
        if (!open) {
            loadLocations();
        }
    };

    // State for editing individual items
    const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
    const editingItem = editingItemIndex !== null ? teethList[editingItemIndex] : null;

    const handleAddItem = (item: ToothEntry) => {
        setTeethList(prev => [...prev, item]);
    };

    const handleUpdateItem = (item: ToothEntry, index: number) => {
        const newList = [...teethList];
        newList[index] = item;
        setTeethList(newList);
        setEditingItemIndex(null);
    };

    const handleSelectItemForEdit = (item: ToothEntry, index: number) => {
        setEditingItemIndex(index);
    };

    const handleCancelEdit = () => {
        setEditingItemIndex(null);
    };

    const removeTooth = (index: number) => {
        setTeethList(teethList.filter((_, i) => i !== index));
        if (editingItemIndex === index) {
            setEditingItemIndex(null);
        }
    };

    const calculateTotal = () => {
        return teethList.reduce((acc, item) => {
            const itemTotal = Object.values(item.values).reduce((sum, val) => sum + (parseInt(val || '0') / 100), 0);
            return acc + itemTotal;
        }, 0);
    };

    const handleSave = async () => {
        if (teethList.length === 0) {
            toast({ variant: "destructive", title: "Erro", description: "Adicione pelo menos um item ao orçamento." });
            return;
        }
        if (dentists.length > 0 && !responsibleDentistId) {
            toast({ variant: "destructive", title: "Erro", description: "Selecione a dentista responsável pelo orçamento." });
            return;
        }

        try {
            setSaving(true);
            const subtotal = calculateTotal();
            const total = Math.max(subtotal - discountAmount, 0);
            const allTreatments = [...new Set(teethList.flatMap(t => t.treatments))].join(', ');
            const responsibleDentistName = dentists.find(d => d.id === responsibleDentistId)?.name || null;

            const notesData = JSON.stringify({
                teeth: teethList,
                location: location,
                locationRate: locationRate ? parseFloat(locationRate) : 0,
                responsibleDentistId: responsibleDentistId || null,
                responsibleDentistName,
                treatmentPlan: subscription
                    ? { id: subscription.id, name: planName, discountAmount: Math.round(discountAmount * 100) / 100 }
                    : null,
            });

            // Create budget items for relation
            const budgetItems = teethList.map(t => ({
                tooth: getShortToothId(t.tooth),
                faces: t.faces,
            }));

            if (isEditing && budget) {
                // Update existing budget
                await budgetsService.update(budget.id, {
                    date: date,
                    treatment: allTreatments,
                    value: total,
                    notes: notesData,
                    status: calculateBudgetStatus(teethList)
                });

                // Sync updated rates to existing financial transactions
                await financialService.syncBudgetRates(budget.id, teethList);

                toast({ title: "Sucesso", description: "Orçamento atualizado com sucesso!" });
            } else {
                // Create new budget
                const budgetData: BudgetInsert = {
                    patient_id: patientId,
                    date: date,
                    treatment: allTreatments,
                    value: total,
                    notes: notesData,
                    status: 'pending'
                };

                await budgetsService.create(budgetData, budgetItems);
                toast({ title: "Sucesso", description: "Orçamento criado com sucesso!" });
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            const fallback = isEditing ? "Falha ao atualizar orçamento." : "Falha ao criar orçamento.";
            const detail = (error as any)?.message || (error as any)?.details || fallback;
            toast({ variant: "destructive", title: "Erro", description: detail });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 border-b shrink-0">
                    <DialogTitle>{isEditing ? 'Editar Plano de Tratamento' : 'Novo Plano de Tratamento'}</DialogTitle>
                </DialogHeader>

                <div className="flex flex-1 overflow-hidden">
                    {/* Left Column: Input Form */}
                    <BudgetForm
                        date={date}
                        setDate={setDate}
                        locationRate={locationRate}
                        setLocationRate={setLocationRate}
                        location={location}
                        setLocation={setLocation}
                        locations={locations}
                        responsibleDentistId={responsibleDentistId}
                        setResponsibleDentistId={setResponsibleDentistId}
                        dentists={dentists}
                        onAddItem={handleAddItem}
                        onUpdateItem={handleUpdateItem}
                        editingItem={editingItem}
                        editingIndex={editingItemIndex}
                        onCancelEdit={handleCancelEdit}
                        toothEntries={teethList}
                        onAddLocation={() => setLocationsModalOpen(true)}
                    />

                    {/* Right Column: Summary */}
                    <BudgetSummary
                        items={teethList}
                        discountAmount={discountAmount}
                        planName={planName}
                        onRemoveItem={removeTooth}
                        onSelectItem={handleSelectItemForEdit}
                        selectedItemIndex={editingItemIndex}
                        onSave={handleSave}
                        onCancel={onClose}
                        saving={saving}
                    />
                </div>
            </DialogContent>

            <LocationsModal
                open={locationsModalOpen}
                onOpenChange={handleLocationsModalChange}
            />
        </Dialog>
    );
}
