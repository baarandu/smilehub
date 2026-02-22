import { supabase } from '@/lib/supabase';
import type {
  ProsthesisLab,
  ProsthesisOrder,
  ProsthesisOrderInsert,
  ProsthesisOrderHistory,
  ProsthesisOrderFilters,
  ProsthesisStatus,
  ProsthesisShipment,
} from '@/types/prosthesis';
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

  async getPreLabCount(clinicId: string): Promise<number> {
    const { count, error } = await supabase
      .from('prosthesis_orders')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .eq('status', 'pre_lab');

    if (error) throw error;
    return count || 0;
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
      .select('status, current_shipment_number')
      .eq('id', orderId)
      .single();

    if (fetchError) throw fetchError;
    if (!current) throw new Error('Ordem não encontrada');

    const oldStatus = current.status as ProsthesisStatus;
    const currentShipmentNum = current.current_shipment_number || 0;

    // Build update object with status date
    const updateData: Record<string, any> = {
      status: newStatus,
      position: newPosition,
    };

    const dateField = getStatusDateField(newStatus);
    if (dateField) {
      updateData[dateField] = new Date().toISOString();
    }

    // Handle shipment transitions
    if (oldStatus === 'pre_lab' && newStatus === 'in_lab') {
      // First send to lab: create shipment #1
      const newShipmentNum = 1;
      updateData.current_shipment_number = newShipmentNum;
      await supabase.from('prosthesis_shipments').insert({
        order_id: orderId,
        shipment_number: newShipmentNum,
        sent_to_lab_at: new Date().toISOString(),
        created_by: userId,
        notes: notes || null,
      });
    } else if (oldStatus === 'in_lab' && newStatus === 'in_clinic') {
      // Returned from lab: set returned_to_clinic_at on current shipment
      await supabase
        .from('prosthesis_shipments')
        .update({ returned_to_clinic_at: new Date().toISOString() })
        .eq('order_id', orderId)
        .eq('shipment_number', currentShipmentNum);
    } else if (oldStatus === 'in_clinic' && newStatus === 'in_lab') {
      // Re-send to lab: create next shipment
      const newShipmentNum = currentShipmentNum + 1;
      updateData.current_shipment_number = newShipmentNum;
      await supabase.from('prosthesis_shipments').insert({
        order_id: orderId,
        shipment_number: newShipmentNum,
        sent_to_lab_at: new Date().toISOString(),
        created_by: userId,
        notes: notes || null,
      });
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

  async getOrdersByPatient(patientId: string): Promise<ProsthesisOrder[]> {
    const { data, error } = await supabase
      .from('prosthesis_orders')
      .select(ORDER_SELECT)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapOrder);
  },

  async completeOrderAutomatically(orderId: string, userId: string): Promise<void> {
    // Fetch current order to check status
    const { data: current, error } = await supabase
      .from('prosthesis_orders')
      .select('status, clinic_id')
      .eq('id', orderId)
      .single();

    if (error || !current) return;
    if (current.status === 'completed') return;

    // Calculate new position (append to end of completed column)
    const { data: maxPos } = await supabase
      .from('prosthesis_orders')
      .select('position')
      .eq('clinic_id', current.clinic_id)
      .eq('status', 'completed')
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const newPosition = (maxPos?.position ?? -1) + 1;

    await this.moveOrder(orderId, 'completed', newPosition, userId, 'Concluído automaticamente via procedimento');
  },

  async getOrderByBudgetLink(budgetId: string, toothIndex: number): Promise<ProsthesisOrder | null> {
    const { data, error } = await supabase
      .from('prosthesis_orders')
      .select(ORDER_SELECT)
      .eq('budget_id', budgetId)
      .eq('budget_tooth_index', toothIndex)
      .maybeSingle();

    if (error) throw error;
    return data ? mapOrder(data) : null;
  },

  async createOrderFromBudget(data: ProsthesisOrderInsert): Promise<ProsthesisOrder> {
    // Same as createOrder but budget_id and budget_tooth_index are already in the data
    return this.createOrder(data);
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

  // ==================== Shipments ====================

  async getShipments(orderId: string): Promise<ProsthesisShipment[]> {
    const { data, error } = await supabase
      .from('prosthesis_shipments')
      .select('*')
      .eq('order_id', orderId)
      .order('shipment_number');

    if (error) throw error;
    return data || [];
  },
};
