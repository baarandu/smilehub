import { useState, useMemo } from 'react';
import { remindersService, Reminder } from '@/services/reminders';
import { toast } from 'sonner';

export type ReminderFilter = 'all' | 'active' | 'paused';

interface ReminderForm {
    title: string;
    description: string;
    scheduled_date: string;
}

export function useReminders() {
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [loadingReminders, setLoadingReminders] = useState(true);
    const [showReminderDialog, setShowReminderDialog] = useState(false);
    const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
    const [reminderForm, setReminderForm] = useState<ReminderForm>({ title: '', description: '', scheduled_date: '' });
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
            if (editingReminder) {
                await remindersService.update(editingReminder.id, {
                    title: reminderForm.title,
                    description: reminderForm.description,
                    scheduled_date: reminderForm.scheduled_date || null
                });
                toast.success('Lembrete atualizado!');
            } else {
                await remindersService.create({
                    title: reminderForm.title,
                    description: reminderForm.description,
                    scheduled_date: reminderForm.scheduled_date || null,
                    is_active: true
                });
                toast.success('Lembrete criado!');
            }
            setShowReminderDialog(false);
            setReminderForm({ title: '', description: '', scheduled_date: '' });
            setEditingReminder(null);
            loadReminders();
        } catch (error) {
            console.error(error);
            toast.error('Houve um erro ao salvar o lembrete');
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
            setReminders(reminders.map(r => r.id === id ? { ...r, is_active: !currentStatus } : r));
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
            scheduled_date: reminder.scheduled_date || ''
        });
        setShowReminderDialog(true);
    };

    const closeDialog = () => {
        setShowReminderDialog(false);
        setEditingReminder(null);
        setReminderForm({ title: '', description: '', scheduled_date: '' });
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

    const formatReminderDate = (dateStr: string | null, createdAt: string) => {
        if (dateStr) {
            const date = new Date(dateStr + 'T00:00:00');
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
