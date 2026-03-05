import { supabase } from '@/lib/supabase';

export interface OpportunityDetailRow {
  id: string;
  patient_id?: string;
  patient_name: string;
  phone?: string | null;
  value?: number;
  date?: string;
  extra?: string;
}

export interface OpportunityCard {
  key: string;
  title: string;
  count: number;
  value: number; // em reais
  description: string;
  period: string;
  icon: string;
  color: string;
}

export interface FunnelStep {
  label: string;
  count: number;
  percent: number;
  color: string;
}

export const crmMetricsService = {
  async getOpportunityCards(clinicId: string): Promise<OpportunityCard[]> {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];
    const sixMonthsAgo = new Date(now.getTime() - 180 * 86400000).toISOString().split('T')[0];
    const seventyTwoHoursLater = new Date(now.getTime() + 72 * 3600000).toISOString().split('T')[0];

    const cards: OpportunityCard[] = [];

    // 1. Orcamentos nao aprovados (ultimos 30 dias)
    const { data: pendingBudgets } = await supabase
      .from('budgets')
      .select('id, value')
      .eq('clinic_id', clinicId)
      .eq('status', 'pending')
      .gte('created_at', thirtyDaysAgo);

    const pendingValue = (pendingBudgets || []).reduce((sum, b) => sum + (b.value || 0), 0);
    cards.push({
      key: 'pending_budgets',
      title: 'Orçamentos não aprovados',
      count: (pendingBudgets || []).length,
      value: pendingValue,
      description: 'Em orçamentos aguardando aprovação',
      period: 'Últimos 30 dias',
      icon: 'file-text',
      color: '#f59e0b',
    });

    // 2. Pacientes que faltaram/desmarcaram (ultimos 30 dias)
    const { data: noShows } = await supabase
      .from('appointments')
      .select('id, patient_id')
      .eq('clinic_id', clinicId)
      .in('status', ['no_show', 'cancelled'])
      .gte('date', thirtyDaysAgo);

    // Get unique patients who missed
    const noShowPatientIds = [...new Set((noShows || []).map(a => a.patient_id))];

    // Check which of those have NOT been rescheduled
    let notRescheduledCount = noShowPatientIds.length;
    if (noShowPatientIds.length > 0) {
      const { data: rescheduled } = await supabase
        .from('appointments')
        .select('patient_id')
        .eq('clinic_id', clinicId)
        .in('patient_id', noShowPatientIds)
        .in('status', ['scheduled', 'confirmed'])
        .gte('date', today);

      const rescheduledSet = new Set((rescheduled || []).map(a => a.patient_id));
      notRescheduledCount = noShowPatientIds.filter(id => !rescheduledSet.has(id)).length;
    }

    cards.push({
      key: 'not_rescheduled',
      title: 'Pacientes não reagendados',
      count: notRescheduledCount,
      value: 0,
      description: 'Faltaram ou desmarcaram e não reagendaram',
      period: 'Últimos 30 dias',
      icon: 'user-x',
      color: '#ef4444',
    });

    // 3. Agendamentos nao confirmados (proximas 72h)
    const { data: unconfirmed } = await supabase
      .from('appointments')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('status', 'scheduled')
      .gte('date', today)
      .lte('date', seventyTwoHoursLater);

    cards.push({
      key: 'unconfirmed',
      title: 'Agendamentos não confirmados',
      count: (unconfirmed || []).length,
      value: 0,
      description: 'Seu custo hora. Reduza as faltas.',
      period: 'Próximas 72 horas',
      icon: 'calendar-clock',
      color: '#8b5cf6',
    });

    // 4. Pacientes ausentes ha 6+ meses
    const { data: allPatients } = await supabase
      .from('patients')
      .select('id')
      .eq('clinic_id', clinicId)
      .is('deleted_at', null);

    const patientIds = (allPatients || []).map(p => p.id);
    let absentCount = 0;

    if (patientIds.length > 0) {
      // Get last appointment per patient
      const { data: recentAppts } = await supabase
        .from('appointments')
        .select('patient_id, date')
        .eq('clinic_id', clinicId)
        .eq('status', 'completed')
        .in('patient_id', patientIds)
        .order('date', { ascending: false });

      const lastVisit: Record<string, string> = {};
      (recentAppts || []).forEach(a => {
        if (!lastVisit[a.patient_id]) lastVisit[a.patient_id] = a.date;
      });

      absentCount = patientIds.filter(id => {
        const last = lastVisit[id];
        return last && last < sixMonthsAgo;
      }).length;
    }

    cards.push({
      key: 'absent_patients',
      title: 'Pacientes ausentes há 6 meses',
      count: absentCount,
      value: 0,
      description: 'Receita potencial destes pacientes',
      period: 'Últimos 6 meses',
      icon: 'clock',
      color: '#06b6d4',
    });

    // 5. Orcamentos perdidos (pending ha mais de 30 dias)
    const { data: staleBudgets } = await supabase
      .from('budgets')
      .select('id, value')
      .eq('clinic_id', clinicId)
      .eq('status', 'pending')
      .lt('created_at', thirtyDaysAgo);

    const staleValue = (staleBudgets || []).reduce((sum, b) => sum + (b.value || 0), 0);
    cards.push({
      key: 'lost_budgets',
      title: 'Orçamentos perdidos',
      count: (staleBudgets || []).length,
      value: staleValue,
      description: 'Pendentes há mais de 30 dias sem aprovação',
      period: 'Todos',
      icon: 'file-x',
      color: '#dc2626',
    });

    // 6. Orcamentos aprovados sem agendamento futuro
    const { data: approvedBudgets } = await supabase
      .from('budgets')
      .select('id, patient_id, value')
      .eq('clinic_id', clinicId)
      .eq('status', 'approved');

    let noAppointmentCount = 0;
    let noAppointmentValue = 0;

    if ((approvedBudgets || []).length > 0) {
      const budgetPatientIds = [...new Set(approvedBudgets!.map(b => b.patient_id))];
      const { data: futureAppts } = await supabase
        .from('appointments')
        .select('patient_id')
        .eq('clinic_id', clinicId)
        .in('patient_id', budgetPatientIds)
        .in('status', ['scheduled', 'confirmed'])
        .gte('date', today);

      const hasApptSet = new Set((futureAppts || []).map(a => a.patient_id));
      const withoutAppt = approvedBudgets!.filter(b => !hasApptSet.has(b.patient_id));
      noAppointmentCount = withoutAppt.length;
      noAppointmentValue = withoutAppt.reduce((sum, b) => sum + (b.value || 0), 0);
    }

    cards.push({
      key: 'approved_no_appointment',
      title: 'Tratamentos sem agendamento',
      count: noAppointmentCount,
      value: noAppointmentValue,
      description: 'Orçamentos aprovados sem consulta agendada',
      period: 'Todos',
      icon: 'calendar-x',
      color: '#ec4899',
    });

    // 6. Pacientes com maiores tickets (ultimos 12 meses)
    const twelveMonthsAgo = new Date(now.getTime() - 365 * 86400000).toISOString().split('T')[0];
    const { data: topPatients } = await supabase
      .from('budgets')
      .select('patient_id, value')
      .eq('clinic_id', clinicId)
      .eq('status', 'approved')
      .gte('created_at', twelveMonthsAgo);

    const patientRevenue: Record<string, number> = {};
    (topPatients || []).forEach(b => {
      patientRevenue[b.patient_id] = (patientRevenue[b.patient_id] || 0) + (b.value || 0);
    });

    const topCount = Object.keys(patientRevenue).length;
    const topValue = Object.values(patientRevenue).reduce((s, v) => s + v, 0);

    cards.push({
      key: 'top_patients',
      title: 'Pacientes com maiores tickets',
      count: topCount,
      value: topValue,
      description: 'Receita gerada por estes pacientes',
      period: 'Últimos 12 meses',
      icon: 'trophy',
      color: '#10b981',
    });

    return cards;
  },

  async getFunnelData(clinicId: string): Promise<FunnelStep[]> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

    // Count leads
    const { count: leadsCount } = await supabase
      .from('crm_leads')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .gte('created_at', thirtyDaysAgo);

    // Count scheduled appointments (from leads or all)
    const { count: scheduledCount } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .gte('date', thirtyDaysAgo)
      .in('status', ['scheduled', 'confirmed', 'completed', 'no_show']);

    // Count no shows + cancelled
    const { count: missedCount } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .gte('date', thirtyDaysAgo)
      .in('status', ['no_show', 'cancelled']);

    // Count completed appointments
    const { count: attendedCount } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .gte('date', thirtyDaysAgo)
      .eq('status', 'completed');

    // Count budgets created
    const { count: budgetsCreated } = await supabase
      .from('budgets')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .gte('created_at', thirtyDaysAgo);

    // Count approved budgets
    const { count: budgetsApproved } = await supabase
      .from('budgets')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .eq('status', 'approved')
      .gte('created_at', thirtyDaysAgo);

    // Count lost budgets (pending > 30 days)
    const { count: budgetsLost } = await supabase
      .from('budgets')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .eq('status', 'pending')
      .gte('created_at', thirtyDaysAgo);

    const leads = leadsCount || 0;
    const scheduled = scheduledCount || 0;
    const missed = missedCount || 0;
    const attended = attendedCount || 0;
    const created = budgetsCreated || 0;
    const approved = budgetsApproved || 0;
    const lost = (budgetsLost || 0) - approved; // pending that weren't approved

    const max = Math.max(leads, scheduled, 1);

    return [
      { label: 'Leads', count: leads, percent: Math.round((leads / max) * 100), color: '#3b82f6' },
      { label: 'Consulta agendada', count: scheduled, percent: Math.round((scheduled / max) * 100), color: '#10b981' },
      { label: 'Faltaram/desmarcaram', count: missed, percent: Math.round((missed / max) * 100), color: '#f59e0b' },
      { label: 'Atendidos', count: attended, percent: Math.round((attended / max) * 100), color: '#8b5cf6' },
      { label: 'Orçamento criado', count: created, percent: Math.round((created / max) * 100), color: '#ec4899' },
      { label: 'Orçamento aprovado', count: approved, percent: Math.round((approved / max) * 100), color: '#10b981' },
      { label: 'Orçamento perdido', count: Math.max(0, lost), percent: Math.round((Math.max(0, lost) / max) * 100), color: '#ef4444' },
    ];
  },

  // ==================== Detail queries ====================

  async getCardDetail(clinicId: string, cardKey: string): Promise<OpportunityDetailRow[]> {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];
    const sixMonthsAgo = new Date(now.getTime() - 180 * 86400000).toISOString().split('T')[0];
    const seventyTwoHoursLater = new Date(now.getTime() + 72 * 3600000).toISOString().split('T')[0];

    switch (cardKey) {
      case 'pending_budgets': {
        const { data } = await supabase
          .from('budgets')
          .select('id, patient_id, value, date, treatment, patients!inner(name, phone)')
          .eq('clinic_id', clinicId)
          .eq('status', 'pending')
          .gte('created_at', thirtyDaysAgo)
          .order('created_at', { ascending: false });

        return (data || []).map((b: any) => ({
          id: b.id,
          patient_id: b.patient_id,
          patient_name: b.patients?.name || 'Paciente',
          phone: b.patients?.phone,
          value: b.value,
          date: b.date,
          extra: b.treatment,
        }));
      }

      case 'not_rescheduled': {
        const { data: noShows } = await supabase
          .from('appointments')
          .select('id, patient_id, date, patients!inner(name, phone)')
          .eq('clinic_id', clinicId)
          .in('status', ['no_show', 'cancelled'])
          .gte('date', thirtyDaysAgo)
          .order('date', { ascending: false });

        // Dedupe by patient, keep most recent
        const seen = new Set<string>();
        const unique = (noShows || []).filter((a: any) => {
          if (seen.has(a.patient_id)) return false;
          seen.add(a.patient_id);
          return true;
        });

        // Filter out those who rescheduled
        const patientIds = unique.map((a: any) => a.patient_id);
        if (patientIds.length === 0) return [];

        const { data: rescheduled } = await supabase
          .from('appointments')
          .select('patient_id')
          .eq('clinic_id', clinicId)
          .in('patient_id', patientIds)
          .in('status', ['scheduled', 'confirmed'])
          .gte('date', today);

        const rescheduledSet = new Set((rescheduled || []).map((a: any) => a.patient_id));

        return unique
          .filter((a: any) => !rescheduledSet.has(a.patient_id))
          .map((a: any) => ({
            id: a.id,
            patient_id: a.patient_id,
            patient_name: a.patients?.name || 'Paciente',
            phone: a.patients?.phone,
            date: a.date,
            extra: 'Faltou/desmarcou',
          }));
      }

      case 'unconfirmed': {
        const { data } = await supabase
          .from('appointments')
          .select('id, patient_id, date, time, procedure_name, patients!inner(name, phone)')
          .eq('clinic_id', clinicId)
          .eq('status', 'scheduled')
          .gte('date', today)
          .lte('date', seventyTwoHoursLater)
          .order('date');

        return (data || []).map((a: any) => ({
          id: a.id,
          patient_id: a.patient_id,
          patient_name: a.patients?.name || 'Paciente',
          phone: a.patients?.phone,
          date: a.date,
          extra: [a.time, a.procedure_name].filter(Boolean).join(' - '),
        }));
      }

      case 'absent_patients': {
        const { data: allPatients } = await supabase
          .from('patients')
          .select('id, name, phone')
          .eq('clinic_id', clinicId)
          .is('deleted_at', null);

        if (!allPatients?.length) return [];

        const ids = allPatients.map(p => p.id);
        const { data: appts } = await supabase
          .from('appointments')
          .select('patient_id, date')
          .eq('clinic_id', clinicId)
          .eq('status', 'completed')
          .in('patient_id', ids)
          .order('date', { ascending: false });

        const lastVisit: Record<string, string> = {};
        (appts || []).forEach(a => {
          if (!lastVisit[a.patient_id]) lastVisit[a.patient_id] = a.date;
        });

        return allPatients
          .filter(p => {
            const last = lastVisit[p.id];
            return last && last < sixMonthsAgo;
          })
          .map(p => ({
            id: p.id,
            patient_id: p.id,
            patient_name: p.name,
            phone: p.phone,
            date: lastVisit[p.id],
            extra: 'Ultima consulta',
          }));
      }

      case 'lost_budgets': {
        const { data } = await supabase
          .from('budgets')
          .select('id, patient_id, value, date, treatment, patients!inner(name, phone)')
          .eq('clinic_id', clinicId)
          .eq('status', 'pending')
          .lt('created_at', thirtyDaysAgo)
          .order('created_at', { ascending: false });

        return (data || []).map((b: any) => ({
          id: b.id,
          patient_id: b.patient_id,
          patient_name: b.patients?.name || 'Paciente',
          phone: b.patients?.phone,
          value: b.value,
          date: b.date,
          extra: b.treatment,
        }));
      }

      case 'approved_no_appointment': {
        const { data: budgets } = await supabase
          .from('budgets')
          .select('id, patient_id, value, date, treatment, patients!inner(name, phone)')
          .eq('clinic_id', clinicId)
          .eq('status', 'approved');

        if (!budgets?.length) return [];

        const budgetPatientIds = [...new Set(budgets.map((b: any) => b.patient_id))];
        const { data: futureAppts } = await supabase
          .from('appointments')
          .select('patient_id')
          .eq('clinic_id', clinicId)
          .in('patient_id', budgetPatientIds)
          .in('status', ['scheduled', 'confirmed'])
          .gte('date', today);

        const hasApptSet = new Set((futureAppts || []).map((a: any) => a.patient_id));

        return budgets
          .filter((b: any) => !hasApptSet.has(b.patient_id))
          .map((b: any) => ({
            id: b.id,
            patient_id: b.patient_id,
            patient_name: b.patients?.name || 'Paciente',
            phone: b.patients?.phone,
            value: b.value,
            date: b.date,
            extra: b.treatment,
          }));
      }

      case 'top_patients': {
        const twelveMonthsAgo = new Date(now.getTime() - 365 * 86400000).toISOString().split('T')[0];
        const { data } = await supabase
          .from('budgets')
          .select('patient_id, value, patients!inner(name, phone)')
          .eq('clinic_id', clinicId)
          .eq('status', 'approved')
          .gte('created_at', twelveMonthsAgo);

        // Aggregate by patient
        const byPatient: Record<string, { name: string; phone: string | null; total: number }> = {};
        (data || []).forEach((b: any) => {
          const pid = b.patient_id;
          if (!byPatient[pid]) {
            byPatient[pid] = { name: b.patients?.name || 'Paciente', phone: b.patients?.phone, total: 0 };
          }
          byPatient[pid].total += b.value || 0;
        });

        return Object.entries(byPatient)
          .sort(([, a], [, b]) => b.total - a.total)
          .slice(0, 20)
          .map(([pid, info]) => ({
            id: pid,
            patient_id: pid,
            patient_name: info.name,
            phone: info.phone,
            value: info.total,
          }));
      }

      default:
        return [];
    }
  },
};
