import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export interface CustomTemplate {
    id: string;
    title: string;
    message: string;
}

const DEFAULT_BIRTHDAY_TEMPLATE = "Parabéns {name}! 🎉\n\nNós do Organiza Odonto desejamos a você um feliz aniversário, muita saúde e alegria!\n\nConte sempre conosco para cuidar do seu sorriso.";
const DEFAULT_RETURN_TEMPLATE = "Olá {name}, tudo bem?\n\nNotamos que já se passaram 6 meses desde seu último procedimento conosco. Que tal agendar uma avaliação de retorno para garantir que está tudo certo com seu sorriso?";
const DEFAULT_CONFIRMATION_TEMPLATE = "Olá {name}! 👋\n\nPassando para confirmar sua consulta agendada para amanhã.\n\nPodemos contar com sua presença? Por favor, confirme respondendo esta mensagem.";

export function useTemplates() {
    const [birthdayTemplate, setBirthdayTemplate] = useState('');
    const [returnTemplate, setReturnTemplate] = useState('');
    const [confirmationTemplate, setConfirmationTemplate] = useState('');
    const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        const loadedBirthday = localStorage.getItem('birthdayTemplate');
        const loadedReturn = localStorage.getItem('returnTemplate');
        const loadedConfirmation = localStorage.getItem('confirmationTemplate');
        const loadedCustom = localStorage.getItem('customTemplates');

        setBirthdayTemplate(loadedBirthday || DEFAULT_BIRTHDAY_TEMPLATE);
        setReturnTemplate(loadedReturn || DEFAULT_RETURN_TEMPLATE);
        setConfirmationTemplate(loadedConfirmation || DEFAULT_CONFIRMATION_TEMPLATE);

        if (loadedCustom) {
            try {
                setCustomTemplates(JSON.parse(loadedCustom));
            } catch (e) {
                console.error('Error parsing custom templates:', e);
            }
        }
    }, []);

    const saveTemplates = () => {
        localStorage.setItem('birthdayTemplate', birthdayTemplate);
        localStorage.setItem('returnTemplate', returnTemplate);
        localStorage.setItem('confirmationTemplate', confirmationTemplate);
        localStorage.setItem('customTemplates', JSON.stringify(customTemplates));
        setShowSettings(false);
        toast.success('Configurações salvas!');
    };

    const handleAddCustomTemplate = () => {
        setCustomTemplates([...customTemplates, { id: Date.now().toString(), title: '', message: '' }]);
    };

    const handleUpdateCustomTemplate = (id: string, updates: Partial<CustomTemplate>) => {
        setCustomTemplates(customTemplates.map(t => t.id === id ? { ...t, ...updates } : t));
    };

    const handleDeleteCustomTemplate = (id: string) => {
        if (confirm('Deseja excluir esta mensagem personalizada?')) {
            setCustomTemplates(customTemplates.filter(t => t.id !== id));
        }
    };

    const getTemplateByType = (type: 'birthday' | 'return' | 'reminder') => {
        if (type === 'birthday') return birthdayTemplate;
        if (type === 'return') return returnTemplate;
        return confirmationTemplate;
    };

    return {
        birthdayTemplate,
        setBirthdayTemplate,
        returnTemplate,
        setReturnTemplate,
        confirmationTemplate,
        setConfirmationTemplate,
        customTemplates,
        showSettings,
        setShowSettings,
        saveTemplates,
        handleAddCustomTemplate,
        handleUpdateCustomTemplate,
        handleDeleteCustomTemplate,
        getTemplateByType,
    };
}
