import { useState, useEffect, useCallback } from 'react';
import { evolutionApi } from '@/services/evolutionApi';
import { getPatients } from '@/services/patients';
import { Patient } from '@/types/database';
import { toast } from 'sonner';

interface UseWhatsAppMessagingProps {
    getTemplateByType: (type: 'birthday' | 'return' | 'reminder') => string;
    dismissAlert: any;
}

export function useWhatsAppMessaging({ getTemplateByType, dismissAlert }: UseWhatsAppMessagingProps) {
    const [whatsappConnected, setWhatsappConnected] = useState(false);
    const [isSendingWhatsapp, setIsSendingWhatsapp] = useState<string | null>(null);
    const [showPatientSelect, setShowPatientSelect] = useState(false);
    const [sendingTemplate, setSendingTemplate] = useState<string | null>(null);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const checkWhatsappStatus = useCallback(async () => {
        try {
            const result = await evolutionApi.getStatus();
            setWhatsappConnected(result.status === 'connected');
        } catch {
            setWhatsappConnected(false);
        }
    }, []);

    useEffect(() => {
        checkWhatsappStatus();
        const interval = setInterval(checkWhatsappStatus, 30000);
        return () => clearInterval(interval);
    }, [checkWhatsappStatus]);

    const loadPatients = async () => {
        try {
            const data = await getPatients();
            setPatients(data);
        } catch (e) {
            console.error(e);
        }
    };

    const handleWhatsApp = async (
        phone: string,
        name: string,
        type: 'birthday' | 'return' | 'reminder',
        alertInfo?: { patientId: string; alertDate: string }
    ) => {
        const cleanPhone = phone.replace(/\D/g, '');
        const firstName = name.split(' ')[0];
        const template = getTemplateByType(type);
        const message = template.replace('{name}', firstName);

        if (whatsappConnected) {
            const messageId = `${cleanPhone}-${Date.now()}`;
            setIsSendingWhatsapp(messageId);
            try {
                await evolutionApi.sendTest(cleanPhone, message);
                toast.success('Mensagem enviada via WhatsApp!');

                if (alertInfo) {
                    const alertType = type === 'birthday' ? 'birthday' : 'procedure_return';
                    dismissAlert.mutate({
                        alertType: alertType as 'birthday' | 'procedure_return',
                        patientId: alertInfo.patientId,
                        alertDate: alertInfo.alertDate,
                        action: 'messaged'
                    });
                }
            } catch (error) {
                console.error('Error sending WhatsApp:', error);
                toast.error('Falha ao enviar. Abrindo WhatsApp Web...');
                const encoded = encodeURIComponent(message);
                window.open(`https://wa.me/55${cleanPhone}?text=${encoded}`, '_blank');
            } finally {
                setIsSendingWhatsapp(null);
            }
        } else {
            const encoded = encodeURIComponent(message);
            window.open(`https://wa.me/55${cleanPhone}?text=${encoded}`, '_blank');

            if (alertInfo) {
                const alertType = type === 'birthday' ? 'birthday' : 'procedure_return';
                dismissAlert.mutate({
                    alertType: alertType as 'birthday' | 'procedure_return',
                    patientId: alertInfo.patientId,
                    alertDate: alertInfo.alertDate,
                    action: 'messaged'
                });
            }
        }
    };

    const initiateSendMessage = (template: string, closeSettings: () => void) => {
        setSendingTemplate(template);
        closeSettings();
        loadPatients();
        setTimeout(() => setShowPatientSelect(true), 200);
    };

    const handleSelectPatient = async (patient: Patient) => {
        if (!sendingTemplate) return;
        const cleanPhone = patient.phone.replace(/\D/g, '');
        const firstName = patient.name.split(' ')[0];
        const message = sendingTemplate.replace('{name}', firstName);

        if (whatsappConnected) {
            const messageId = `${cleanPhone}-${Date.now()}`;
            setIsSendingWhatsapp(messageId);
            try {
                await evolutionApi.sendTest(cleanPhone, message);
                toast.success(`Mensagem enviada para ${firstName}!`);
            } catch (error) {
                console.error('Error sending WhatsApp:', error);
                toast.error('Falha ao enviar. Abrindo WhatsApp Web...');
                const encoded = encodeURIComponent(message);
                window.open(`https://wa.me/55${cleanPhone}?text=${encoded}`, '_blank');
            } finally {
                setIsSendingWhatsapp(null);
            }
        } else {
            const encoded = encodeURIComponent(message);
            window.open(`https://wa.me/55${cleanPhone}?text=${encoded}`, '_blank');
        }

        setShowPatientSelect(false);
        setSendingTemplate(null);
        setSearchQuery('');
    };

    const filteredPatients = patients.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.phone.includes(searchQuery)
    );

    return {
        whatsappConnected,
        isSendingWhatsapp,
        showPatientSelect,
        setShowPatientSelect,
        searchQuery,
        setSearchQuery,
        filteredPatients,
        checkWhatsappStatus,
        handleWhatsApp,
        initiateSendMessage,
        handleSelectPatient,
    };
}
