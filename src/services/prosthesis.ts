import { supabase } from '@/lib/supabase';
import type {
  ProsthesisLab,
  ProsthesisOrder,
  ProsthesisOrderInsert,
  ProsthesisOrderHistory,
  ProsthesisOrderFilters,
  ProsthesisStatus,
} from '@/types/prosthesis';
import { isChecklistComplete } from '@/utils/prosthesis';
import { getStatusDateField } from '@/utils/prosthesis';

const ORDER_SELECT = `
  *,
  patients!inner(name),
  profiles!prosthesis_orders_dentist_id_fkey(full_name),
  prosthesis_labs(name)
`;

function mapOrder(row: any): ProsthesisOrder {
  return {
    ...row,
    patient_name: row.patients?.name,
    dentist_name: row.profiles?.full_name,
    lab_name: row.prosthesis_labs?.name ?? null,
    patients: undefined,
    profiles: undefined,
    prosthesis_labs: undefined,
  };
}

export const prosthesisService = {
  // ==================== Labs ====================

  async getLabs(clinicId: string): Promise<ProsthesisLab[]> {
    const { data, error } = await supabase
      .from('prosthesis_labs')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getActiveLabs(clinicId: string): Promise<ProsthesisLab[]> {
    const { data, error } = await supabase
      .from('prosthesis_labs')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async createLab(data: Partial<ProsthesisLab> & { clinic_id: string; name: string }): Promise<ProsthesisLab> {
    const { data: lab, error } = await supabase
      .from('prosthesis_labs')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    if (!lab) throw new Error('Falha ao criar laboratório');
    return lab;
  },

  async updateLab(id: string, updates: Partial<ProsthesisLab>): Promise<ProsthesisLab> {
    const { data, error } = await supabase
      .from('prosthesis_labs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Falha ao atualizar laboratório');
    return data;
  },

  async deleteLab(id: string): Promise<void> {
    const { error } = await supabase
      .from('prosthesis_labs')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // ==================== Orders ====================

  async getOrders(clinicId: string, filters?: ProsthesisOrderFilters): Promise<ProsthesisOrder[]> {
    let query = supabase
      .from('prosthesis_orders')
      .select(ORDER_SELECT)
      .eq('clinic_id', clinicId)
      .order('position');

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.dentistId) query = query.eq('dentist_id', filters.dentistId);
    if (filters?.labId) query = query.eq('lab_id', filters.labId);
    if (filters?.type) query = query.eq('type', filters.type);
    if (filters?.search) query = query.ilike('patients.name', `%${filters.search}%`);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapOrder);
  },

  async getOrderById(id: string): Promise<ProsthesisOrder> {
    const { data, error } = await supabase
      .from('prosthesis_orders')
      .select(ORDER_SELECT)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Ordem não encontrada');
    return mapOrder(data);
  },

  async createOrder(data: ProsthesisOrderInsert): Promise<ProsthesisOrder> {
    // Get max position for pre_lab in this clinic
    const { data: maxPos } = await supabase
      .from('prosthesis_orders')
      .select('position')
      .eq('clinic_id', data.clinic_id)
      .eq('status', 'pre_lab')
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const position = (maxPos?.position ?? -1) + 1;

    const { data: order, error } = await supabase
      .from('prosthesis_orders')
      .insert({ ...data, position })
      .select(ORDER_SELECT)
      .single();

    if (error) throw error;
    if (!order) throw new Error('Falha ao criar ordem');

    // Create initial history entry
    await supabase.from('prosthesis_order_history').insert({
      order_id: order.id,
      from_status: null,
      to_status: 'pre_lab',
      changed_by: data.created_by,
      notes: 'Ordem criada',
    });

    return mapOrder(order);
  },

  async updateOrder(id: string, updates: Partial<ProsthesisOrder>): Promise<ProsthesisOrder> {
    // Remove joined fields
    const { patient_name, dentist_name, lab_name, ...cleanUpdates } = updates;

    const { data, error } = await supabase
      .from('prosthesis_orders')
      .update(cleanUpdates)
      .eq('id', id)
      .select(ORDER_SELECT)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Falha ao atualizar ordem');
    return mapOrder(data);
  },

  async deleteOrder(id: string): Promise<void> {
    const { error } = await supabase
      .from('prosthesis_orders')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // ==================== Status / DnD ====================

  async moveOrder(
    orderId: string,
    newStatus: ProsthesisStatus,
    newPosition: number,
    userId: string,
    notes?: string
  ): Promise<ProsthesisOrder> {
    // Get current order
    const { data: current, error: fetchError } = await supabase
      .from('prosthesis_orders')
      .select('status, checklist_color_defined, checklist_material_defined, checklist_cementation_defined, checklist_photos_attached, checklist_observations_added')
      .eq('id', orderId)
      .single();

    if (fetchError) throw fetchError;
    if (!current) throw new Error('Ordem não encontrada');

    // Validate checklist if moving to 'sent'
    if (newStatus === 'sent' && !isChecklistComplete(current)) {
      throw new Error('CHECKLIST_INCOMPLETE');
    }

    const oldStatus = current.status;

    // Build update object with status date
    const updateData: Record<string, any> = {
      status: newStatus,
      position: newPosition,
    };

    const dateField = getStatusDateField(newStatus);
    if (dateField) {
      updateData[dateField] = new Date().toISOString();
    }

    const { data: updated, error: updateError } = await supabase
      .from('prosthesis_orders')
      .update(updateData)
      .eq('id', orderId)
      .select(ORDER_SELECT)
      .single();

    if (updateError) throw updateError;
    if (!updated) throw new Error('Falha ao mover ordem');

    // Create history entry
    await supabase.from('prosthesis_order_history').insert({
      order_id: orderId,
      from_status: oldStatus,
      to_status: newStatus,
      changed_by: userId,
      notes: notes || null,
    });

    return mapOrder(updated);
  },

  async batchUpdatePositions(updates: { id: string; position: number }[]): Promise<void> {
    // Update positions one by one (Supabase doesn't support batch upsert on arbitrary fields)
    const promises = updates.map(({ id, position }) =>
      supabase.from('prosthesis_orders').update({ position }).eq('id', id)
    );
    const results = await Promise.all(promises);
    const firstError = results.find(r => r.error);
    if (firstError?.error) throw firstError.error;
  },

  // ==================== History ====================

  async getOrderHistory(orderId: string): Promise<ProsthesisOrderHistory[]> {
    const { data, error } = await supabase
      .from('prosthesis_order_history')
      .select(`
        *,
        profiles!prosthesis_order_history_changed_by_fkey(full_name)
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row: any) => ({
      ...row,
      changed_by_name: row.profiles?.full_name ?? null,
      profiles: undefined,
    }));
  },
};
