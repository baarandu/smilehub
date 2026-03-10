import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export interface CustomTemplate {
    id: string;
    title: string;
    message: string;
}

const DEFAULT_BIRTHDAY_TEMPLATE = "Parabens {name}!\n\nNos do Organiza Odonto desejamos a voce um feliz aniversario, muita saude e alegria!\n\nConte sempre conosco para cuidar do seu sorriso.";
const DEFAULT_RETURN_TEMPLATE = "Ola {name}, tudo bem?\n\nNotamos que ja se passaram 6 meses desde seu ultimo procedimento conosco. Que tal agendar uma avaliacao de retorno para garantir que esta tudo certo com seu sorriso?";
const DEFAULT_CONFIRMATION_TEMPLATE = "Ola {name}!\n\nPassando para confirmar sua consulta agendada para amanha.\n\nPodemos contar com sua presenca? Por favor, confirme respondendo esta mensagem.";
const DEFAULT_FOLLOW_UP_TEMPLATE = "Ola {name}!\n\nPassando para saber como voce esta se sentindo apos o atendimento de ontem.\n\nEsta tudo bem? Caso tenha algum desconforto ou duvida, estamos a disposicao!";
const DEFAULT_NO_SHOW_TEMPLATE = "Ola {name}!\n\nSentimos sua falta na consulta de ontem. Esperamos que esteja tudo bem!\n\nGostariamos de reagendar seu atendimento. Quando seria um bom horario para voce?";

export function useTemplates() {
    const [birthdayTemplate, setBirthdayTemplate] = useState('');
    const [returnTemplate, setReturnTemplate] = useState('');
    const [confirmationTemplate, setConfirmationTemplate] = useState('');
    const [followUpTemplate, setFollowUpTemplate] = useState('');
    const [noShowTemplate, setNoShowTemplate] = useState('');
    const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        const loadedBirthday = localStorage.getItem('birthdayTemplate');
        const loadedReturn = localStorage.getItem('returnTemplate');
        const loadedConfirmation = localStorage.getItem('confirmationTemplate');
        const loadedFollowUp = localStorage.getItem('followUpTemplate');
        const loadedNoShow = localStorage.getItem('noShowTemplate');
        const loadedCustom = localStorage.getItem('customTemplates');

        setBirthdayTemplate(loadedBirthday || DEFAULT_BIRTHDAY_TEMPLATE);
        setReturnTemplate(loadedReturn || DEFAULT_RETURN_TEMPLATE);
        setConfirmationTemplate(loadedConfirmation || DEFAULT_CONFIRMATION_TEMPLATE);
        setFollowUpTemplate(loadedFollowUp || DEFAULT_FOLLOW_UP_TEMPLATE);
        setNoShowTemplate(loadedNoShow || DEFAULT_NO_SHOW_TEMPLATE);

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
        localStorage.setItem('followUpTemplate', followUpTemplate);
        localStorage.setItem('noShowTemplate', noShowTemplate);
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

    const getTemplateByType = (type: 'birthday' | 'return' | 'reminder' | 'follow_up' | 'no_show') => {
        if (type === 'birthday') return birthdayTemplate;
        if (type === 'return') return returnTemplate;
        if (type === 'follow_up') return followUpTemplate;
        if (type === 'no_show') return noShowTemplate;
        return confirmationTemplate;
    };

    return {
        birthdayTemplate,
        setBirthdayTemplate,
        returnTemplate,
        setReturnTemplate,
        confirmationTemplate,
        setConfirmationTemplate,
        followUpTemplate,
        setFollowUpTemplate,
        noShowTemplate,
        setNoShowTemplate,
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
