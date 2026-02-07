import { useState, useMemo } from 'react';
import { remindersService, Reminder } from '@/services/reminders';
import { toast } from 'sonner';

export type ReminderFilter = 'all' | 'active' | 'paused';

interface ReminderForm {
    title: string;
    description: string;
    due_date: string;
}

export function useReminders() {
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [loadingReminders, setLoadingReminders] = useState(true);
    const [showReminderDialog, setShowReminderDialog] = useState(false);
    const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
    const [reminderForm, setReminderForm] = useState<ReminderForm>({ title: '', description: '', due_date: '' });
    const [reminderSearch, setReminderSearch] = useState('');
    const [reminderFilter, setReminderFilter] = useState<ReminderFilter>('all');

    const loadReminders = async () => {
        try {
            setLoadingReminders(true);
            const data = await remindersService.getAll();
            setReminders(data);
        } catch (error) {
            console.error('Error loading reminders:', error);
            toast.error('Erro ao carregar lembretes');
        } finally {
            setLoadingReminders(false);
        }
    };

    const handleCreateReminder = async () => {
        if (!reminderForm.title.trim()) {
            toast.error('O título é obrigatório');
            return;
        }

        try {
            const reminderData = {
                title: reminderForm.title,
                description: reminderForm.description,
                due_date: reminderForm.due_date || null,
                is_active: true
            };
            console.log('Saving reminder:', reminderData);

            if (editingReminder) {
                await remindersService.update(editingReminder.id, reminderData);
                toast.success('Lembrete atualizado!');
            } else {
                await remindersService.create(reminderData);
                toast.success('Lembrete criado!');
            }
            setShowReminderDialog(false);
            setReminderForm({ title: '', description: '', due_date: '' });
            setEditingReminder(null);
            await loadReminders();
        } catch (error: any) {
            console.error('Error saving reminder:', error);
            const errorMessage = error?.message || error?.toString() || 'Erro desconhecido';
            toast.error(`Erro ao salvar: ${errorMessage}`);
        }
    };

    const handleDeleteReminder = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este lembrete?')) return;
        try {
            await remindersService.delete(id);
            toast.success('Lembrete excluído');
            loadReminders();
        } catch (error) {
            console.error(error);
            toast.error('Erro ao excluir');
        }
    };

    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        try {
            setReminders(prev => prev.map(r => r.id === id ? { ...r, is_active: !currentStatus } : r));
            await remindersService.update(id, { is_active: !currentStatus });
        } catch (error) {
            loadReminders();
            toast.error('Erro ao atualizar status');
        }
    };

    const openEdit = (reminder: Reminder) => {
        setEditingReminder(reminder);
        setReminderForm({
            title: reminder.title,
            description: reminder.description || '',
            due_date: reminder.due_date || ''
        });
        setShowReminderDialog(true);
    };

    const closeDialog = () => {
        setShowReminderDialog(false);
        setEditingReminder(null);
        setReminderForm({ title: '', description: '', due_date: '' });
    };

    const filteredReminders = useMemo(() => {
        return reminders.filter(r => {
            const matchesSearch = reminderSearch === '' ||
                r.title.toLowerCase().includes(reminderSearch.toLowerCase()) ||
                (r.description?.toLowerCase().includes(reminderSearch.toLowerCase()));

            const matchesFilter =
                reminderFilter === 'all' ||
                (reminderFilter === 'active' && r.is_active) ||
                (reminderFilter === 'paused' && !r.is_active);

            return matchesSearch && matchesFilter;
        });
    }, [reminders, reminderSearch, reminderFilter]);

    const formatReminderDate = (dateStr: string | null | undefined, createdAt: string) => {
        if (dateStr) {
            // Handle both date strings (YYYY-MM-DD) and timestamps
            const date = dateStr.includes('T') ? new Date(dateStr) : new Date(dateStr + 'T00:00:00');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            if (date.getTime() === today.getTime()) {
                return 'Hoje';
            } else if (date.getTime() === tomorrow.getTime()) {
                return 'Amanhã';
            } else {
                return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            }
        }
        return new Date(createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    return {
        reminders,
        loadingReminders,
        showReminderDialog,
        setShowReminderDialog,
        editingReminder,
        reminderForm,
        setReminderForm,
        reminderSearch,
        setReminderSearch,
        reminderFilter,
        setReminderFilter,
        filteredReminders,
        loadReminders,
        handleCreateReminder,
        handleDeleteReminder,
        handleToggleActive,
        openEdit,
        closeDialog,
        formatReminderDate,
    };
}
