import { supabase } from '../lib/supabase';
import type { ProsthesisOrder, ProsthesisLab, ProsthesisShipment, ProsthesisOrderHistory, ProsthesisStatus, ProsthesisOrderFilters } from '../types/prosthesis';

const ordersTable = () => supabase.from('prosthesis_orders') as any;
const labsTable = () => supabase.from('prosthesis_labs') as any;
const shipmentsTable = () => supabase.from('prosthesis_shipments') as any;
const historyTable = () => supabase.from('prosthesis_order_history') as any;

export const prosthesisService = {
  // Labs
  async getLabs(clinicId: string): Promise<ProsthesisLab[]> {
    const { data, error } = await labsTable().select('*').eq('clinic_id', clinicId).order('name');
    if (error) throw error;
    return data || [];
  },

  async getActiveLabs(clinicId: string): Promise<ProsthesisLab[]> {
    const { data, error } = await labsTable().select('*').eq('clinic_id', clinicId).eq('active', true).order('name');
    if (error) throw error;
    return data || [];
  },

  async createLab(data: Partial<ProsthesisLab>): Promise<ProsthesisLab> {
    const { data: result, error } = await labsTable().insert(data).select().single();
    if (error) throw error;
    return result;
  },

  async updateLab(id: string, updates: Partial<ProsthesisLab>): Promise<void> {
    const { error } = await labsTable().update(updates).eq('id', id);
    if (error) throw error;
  },

  async deleteLab(id: string): Promise<void> {
    const { error } = await labsTable().delete().eq('id', id);
    if (error) throw error;
  },

  // Orders
  async getOrders(clinicId: string, filters?: ProsthesisOrderFilters): Promise<ProsthesisOrder[]> {
    let query = ordersTable()
      .select('*, patients!inner(name, phone), profiles!prosthesis_orders_dentist_id_fkey(full_name), prosthesis_labs(name)')
      .eq('clinic_id', clinicId)
      .order('position');

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.dentistId) query = query.eq('dentist_id', filters.dentistId);
    if (filters?.labId) query = query.eq('lab_id', filters.labId);
    if (filters?.type) query = query.eq('type', filters.type);
    if (filters?.search) query = query.ilike('patients.name', `%${filters.search}%`);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((order: any) => ({
      ...order,
      patient_name: order.patients?.name,
      patient_phone: order.patients?.phone,
      dentist_name: order.profiles?.full_name,
      lab_name: order.prosthesis_labs?.name,
    }));
  },

  async getPreLabCount(clinicId: string): Promise<number> {
    const { count, error } = await ordersTable().select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId).neq('status', 'completed');
    if (error) throw error;
    return count || 0;
  },

  async createOrder(data: Partial<ProsthesisOrder>): Promise<ProsthesisOrder> {
    const { data: result, error } = await ordersTable().insert({
      ...data,
      position: 0,
      status: data.status || 'pre_lab',
    }).select().single();
    if (error) throw error;

    // Create initial history
    const { data: { user } } = await supabase.auth.getUser();
    await historyTable().insert({
      order_id: result.id,
      from_status: null,
      to_status: result.status,
      changed_by: user?.id,
      notes: 'Ordem criada',
    });

    return result;
  },

  async updateOrder(id: string, updates: Partial<ProsthesisOrder>): Promise<void> {
    const { patient_name, patient_phone, dentist_name, lab_name, ...clean } = updates as any;
    const { error } = await ordersTable().update(clean).eq('id', id);
    if (error) throw error;
  },

  async deleteOrder(id: string): Promise<void> {
    const { error } = await ordersTable().delete().eq('id', id);
    if (error) throw error;
  },

  async moveOrder(orderId: string, newStatus: ProsthesisStatus, notes?: string): Promise<void> {
    const { data: order, error: fetchError } = await ordersTable().select('*').eq('id', orderId).single();
    if (fetchError) throw fetchError;

    const { data: { user } } = await supabase.auth.getUser();
    const updates: any = { status: newStatus };

    // Set date fields
    if (newStatus === 'completed') updates.date_completed = new Date().toISOString();
    if (newStatus === 'in_lab' && order.status === 'pre_lab') updates.date_sent_to_lab = new Date().toISOString();
    if (newStatus === 'in_clinic') updates.date_returned_to_clinic = new Date().toISOString();

    // Auto-create shipment on lab transitions
    if (newStatus === 'in_lab') {
      const newShipmentNum = (order.current_shipment_number || 0) + 1;
      updates.current_shipment_number = newShipmentNum;
      await shipmentsTable().insert({
        order_id: orderId,
        shipment_number: newShipmentNum,
        sent_to_lab_at: new Date().toISOString(),
      });
    }

    // Update return date on existing shipment
    if (newStatus === 'in_clinic' && order.current_shipment_number > 0) {
      await shipmentsTable()
        .update({ returned_to_clinic_at: new Date().toISOString() })
        .eq('order_id', orderId)
        .eq('shipment_number', order.current_shipment_number);
    }

    const { error } = await ordersTable().update(updates).eq('id', orderId);
    if (error) throw error;

    // Create history entry
    await historyTable().insert({
      order_id: orderId,
      from_status: order.status,
      to_status: newStatus,
      changed_by: user?.id,
      notes: notes || null,
    });
  },

  // History & Shipments
  async getOrderHistory(orderId: string): Promise<ProsthesisOrderHistory[]> {
    const { data, error } = await historyTable().select('*').eq('order_id', orderId).order('changed_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getShipments(orderId: string): Promise<ProsthesisShipment[]> {
    const { data, error } = await shipmentsTable().select('*').eq('order_id', orderId).order('shipment_number');
    if (error) throw error;
    return data || [];
  },
};
