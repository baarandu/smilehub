import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { getPatientById } from '../services/patients';
import { examsService } from '../services/exams';
import { appointmentsService } from '../services/appointments';
import { anamnesesService } from '../services/anamneses';
import { budgetsService } from '../services/budgets';
import { proceduresService } from '../services/procedures';
import type { Patient, AppointmentWithPatient, Anamnese, BudgetWithItems, Procedure, Exam } from '../types/database';

interface UsePatientDataReturn {
    // Data
    patient: Patient | null;
    appointments: AppointmentWithPatient[];
    anamneses: Anamnese[];
    budgets: BudgetWithItems[];
    procedures: Procedure[];
    exams: Exam[];
    loading: boolean;

    // Reload functions
    loadPatient: () => Promise<void>;
    loadAppointments: () => Promise<void>;
    loadAnamneses: () => Promise<void>;
    loadBudgets: () => Promise<void>;
    loadProcedures: () => Promise<void>;
    loadExams: () => Promise<void>;
    refreshAll: () => Promise<void>;
}

export function usePatientData(patientId: string | undefined): UsePatientDataReturn {
    const isMounted = useRef(true);
    const [patient, setPatient] = useState<Patient | null>(null);
    const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([]);
    const [anamneses, setAnamneses] = useState<Anamnese[]>([]);
    const [budgets, setBudgets] = useState<BudgetWithItems[]>([]);
    const [procedures, setProcedures] = useState<Procedure[]>([]);
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    const loadPatient = useCallback(async () => {
        if (!patientId) return;
        try {
            if (isMounted.current) setLoading(true);
            const data = await getPatientById(patientId);
            if (isMounted.current) setPatient(data);
        } catch (error) {
            console.error('Error loading patient:', error);
            if (isMounted.current) Alert.alert('Erro', 'Não foi possível carregar os dados do paciente');
        } finally {
            if (isMounted.current) setLoading(false);
        }
    }, [patientId]);

    const loadAppointments = useCallback(async () => {
        if (!patientId) return;
        try {
            const data = await appointmentsService.getByPatient(patientId);
            if (isMounted.current) setAppointments(data);
        } catch (error) {
            console.error('Error loading appointments:', error);
        }
    }, [patientId]);

    const loadAnamneses = useCallback(async () => {
        if (!patientId) return;
        try {
            const data = await anamnesesService.getByPatient(patientId);
            if (isMounted.current) setAnamneses(data);
        } catch (error) {
            console.error('Error loading anamneses:', error);
        }
    }, [patientId]);

    const loadBudgets = useCallback(async () => {
        if (!patientId) return;
        try {
            const data = await budgetsService.getByPatient(patientId);
            if (isMounted.current) setBudgets(data);
        } catch (error) {
            console.error('Error loading budgets:', error);
        }
    }, [patientId]);

    const loadProcedures = useCallback(async () => {
        if (!patientId) return;
        try {
            const data = await proceduresService.getByPatient(patientId);
            if (isMounted.current) setProcedures(data);
        } catch (error) {
            console.error('Error loading procedures:', error);
        }
    }, [patientId]);

    const loadExams = useCallback(async () => {
        if (!patientId) return;
        try {
            const data = await examsService.getByPatient(patientId);
            if (isMounted.current) setExams(data);
        } catch (error) {
            console.error('Error loading exams:', error);
        }
    }, [patientId]);

    const refreshAll = useCallback(async () => {
        await Promise.all([
            loadPatient(),
            loadAppointments(),
            loadAnamneses(),
            loadBudgets(),
            loadProcedures(),
            loadExams(),
        ]);
    }, [loadPatient, loadAppointments, loadAnamneses, loadBudgets, loadProcedures, loadExams]);

    // Initial load
    useEffect(() => {
        if (patientId) {
            refreshAll();
        }
    }, [patientId, refreshAll]);

    return {
        patient,
        appointments,
        anamneses,
        budgets,
        procedures,
        exams,
        loading,
        loadPatient,
        loadAppointments,
        loadAnamneses,
        loadBudgets,
        loadProcedures,
        loadExams,
        refreshAll,
    };
}
