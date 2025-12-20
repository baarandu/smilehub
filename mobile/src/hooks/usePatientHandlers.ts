import { Alert } from 'react-native';
import { anamnesesService } from '../services/anamneses';
import { proceduresService } from '../services/procedures';
import { budgetsService } from '../services/budgets';
import { examsService } from '../services/exams';
import type { Anamnese, BudgetWithItems, Procedure, Exam } from '../types/database';

interface HandlersProps {
    loadAnamneses: () => void;
    loadBudgets: () => void;
    loadProcedures: () => void;
    loadExams: () => void;
    exams: Exam[];
}

export function usePatientHandlers({
    loadAnamneses,
    loadBudgets,
    loadProcedures,
    loadExams,
    exams,
}: HandlersProps) {
    // Anamnese handlers
    const handleDeleteAnamnese = (anamnese: Anamnese) => {
        Alert.alert('Excluir Anamnese', 'Tem certeza que deseja excluir esta anamnese?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Excluir',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await anamnesesService.delete(anamnese.id);
                        loadAnamneses();
                    } catch (error) {
                        console.error('Error deleting anamnese:', error);
                        Alert.alert('Erro', 'Não foi possível excluir a anamnese');
                    }
                },
            },
        ]);
    };

    // Budget handlers
    const handleDeleteBudget = (budget: BudgetWithItems) => {
        Alert.alert('Excluir Orçamento', 'Tem certeza que deseja excluir este orçamento?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Excluir',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await budgetsService.delete(budget.id);
                        loadBudgets();
                    } catch (error) {
                        console.error('Error deleting budget:', error);
                        Alert.alert('Erro', 'Não foi possível excluir o orçamento');
                    }
                },
            },
        ]);
    };

    // Procedure handlers
    const handleDeleteProcedure = (procedure: Procedure) => {
        Alert.alert('Excluir Procedimento', 'Tem certeza que deseja excluir este procedimento? Os anexos também serão excluídos.', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Excluir',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const linkedExams = exams.filter(e => e.procedure_id === procedure.id);
                        for (const exam of linkedExams) {
                            await examsService.delete(exam.id);
                        }
                        await proceduresService.delete(procedure.id);
                        loadProcedures();
                        loadExams();
                    } catch (error) {
                        console.error('Error deleting procedure:', error);
                        Alert.alert('Erro', 'Não foi possível excluir o procedimento');
                    }
                },
            },
        ]);
    };

    // Exam handlers
    const handleDeleteExam = (exam: Exam) => {
        Alert.alert(
            'Excluir Exame',
            'Tem certeza que deseja excluir este exame? Esta ação não pode ser desfeita.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await examsService.delete(exam.id);
                            loadExams();
                            Alert.alert('Sucesso', 'Exame excluído com sucesso');
                        } catch (error) {
                            console.error('Error deleting exam:', error);
                            Alert.alert('Erro', 'Não foi possível excluir o exame');
                        }
                    },
                },
            ]
        );
    };

    return {
        handleDeleteAnamnese,
        handleDeleteBudget,
        handleDeleteProcedure,
        handleDeleteExam,
    };
}
