import { useState, useEffect, useCallback } from 'react';
import { evolutionApi } from '@/services/evolutionApi';
import { getPatients } from '@/services/patients';
import { Patient } from '@/types/database';
import { toast } from 'sonner';
import { getWhatsAppNumber } from '@/utils/formatters';

export interface ChildInfo {
    patient_type?: string | null;
    mother_name?: string | null;
    father_name?: string | null;
    legal_guardian?: string | null;
}

/** Resolves template variables: {name}, {responsavel}, {paciente} */
function resolveTemplateVariables(
    message: string,
    patientName: string,
    childInfo?: ChildInfo
): string {
    const patientFirst = patientName.split(' ')[0];
    const isChild = childInfo?.patient_type === 'child';

    const guardianFirst = isChild
        ? (childInfo.mother_name?.split(' ')[0] ||
           childInfo.father_name?.split(' ')[0] ||
           childInfo.legal_guardian?.split(' ')[0] ||
           patientFirst)
        : patientFirst;

    const hasExplicitVars = message.includes('{responsavel}') || message.includes('{paciente}');

    if (hasExplicitVars) {
        // Use explicit variables — dentist controls the message fully
        return message
            .replace(/\{responsavel\}/g, guardianFirst)
            .replace(/\{paciente\}/g, patientFirst)
            .replace(/\{name\}/g, isChild ? guardianFirst : patientFirst);
    }

    // Legacy behavior: only {name} used
    message = message.replace(/\{name\}/g, isChild ? guardianFirst : patientFirst);

    // For child patients with only {name}, append child reference
    if (isChild && guardianFirst !== patientFirst) {
        message += `\n\nReferente à consulta de ${patientFirst}.`;
    }

    return message;
}

interface UseWhatsAppMessagingProps {
    getTemplateByType: (type: 'birthday' | 'return' | 'reminder' | 'follow_up' | 'no_show') => string;
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
        type: 'birthday' | 'return' | 'reminder' | 'follow_up' | 'no_show',
        alertInfo?: { patientId: string; alertDate: string },
        childInfo?: ChildInfo
    ) => {
        const template = getTemplateByType(type);
        const message = resolveTemplateVariables(
            template,
            name,
            childInfo
        );

        const getAlertType = () => {
            if (type === 'birthday') return 'birthday';
            if (type === 'follow_up' || type === 'no_show') return 'follow_up';
            return 'procedure_return';
        };

        if (whatsappConnected) {
            const messageId = `${phone.replace(/\D/g, '')}-${Date.now()}`;
            setIsSendingWhatsapp(messageId);
            try {
                await evolutionApi.sendTest(phone, message);
                toast.success('Mensagem enviada via WhatsApp!');

                if (alertInfo) {
                    dismissAlert.mutate({
                        alertType: getAlertType(),
                        patientId: alertInfo.patientId,
                        alertDate: alertInfo.alertDate,
                        action: 'messaged'
                    });
                }
            } catch (error) {
                console.error('Error sending WhatsApp:', error);
                toast.error('Falha ao enviar. Abrindo WhatsApp Web...');
                const encoded = encodeURIComponent(message);
                window.open(`https://wa.me/${getWhatsAppNumber(phone)}?text=${encoded}`, '_blank');
            } finally {
                setIsSendingWhatsapp(null);
            }
        } else {
            const encoded = encodeURIComponent(message);
            window.open(`https://wa.me/${getWhatsAppNumber(phone)}?text=${encoded}`, '_blank');

            if (alertInfo) {
                dismissAlert.mutate({
                    alertType: getAlertType(),
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
        const message = resolveTemplateVariables(
            sendingTemplate,
            patient.name,
            {
                patient_type: (patient as any).patient_type,
                mother_name: (patient as any).mother_name,
                father_name: (patient as any).father_name,
                legal_guardian: (patient as any).legal_guardian,
            }
        );

        if (whatsappConnected) {
            const messageId = `${patient.phone.replace(/\D/g, '')}-${Date.now()}`;
            setIsSendingWhatsapp(messageId);
            try {
                await evolutionApi.sendTest(patient.phone, message);
                toast.success(`Mensagem enviada para ${patient.name.split(' ')[0]}!`);
            } catch (error) {
                console.error('Error sending WhatsApp:', error);
                toast.error('Falha ao enviar. Abrindo WhatsApp Web...');
                const encoded = encodeURIComponent(message);
                window.open(`https://wa.me/${getWhatsAppNumber(patient.phone)}?text=${encoded}`, '_blank');
            } finally {
                setIsSendingWhatsapp(null);
            }
        } else {
            const encoded = encodeURIComponent(message);
            window.open(`https://wa.me/${getWhatsAppNumber(patient.phone)}?text=${encoded}`, '_blank');
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
