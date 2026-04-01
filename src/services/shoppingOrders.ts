import { supabase } from '@/lib/supabase';
import type { ShoppingItem, ShoppingOrder } from '@/types/materials';
import { migrateItems } from '@/utils/materials';

async function getClinicId(): Promise<{ userId: string; clinicId: string } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: clinicUser } = await supabase
    .from('clinic_users')
    .select('clinic_id')
    .eq('user_id', user.id)
    .single();

  if (!clinicUser) return null;
  return { userId: user.id, clinicId: (clinicUser as any).clinic_id };
}

export async function fetchOrders(): Promise<{
  pending: ShoppingOrder[];
  completed: ShoppingOrder[];
  clinicId: string | null;
} | null> {
  const ctx = await getClinicId();
  if (!ctx) return null;

  const [{ data: pending }, { data: completed }] = await Promise.all([
    (supabase.from('shopping_orders') as any)
      .select('*')
      .eq('clinic_id', ctx.clinicId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    (supabase.from('shopping_orders') as any)
      .select('*')
      .eq('clinic_id', ctx.clinicId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false }),
  ]);

  return {
    pending: (pending || []).map((o: any) => ({ ...o, items: migrateItems(o.items) })),
    completed: (completed || []).map((o: any) => ({ ...o, items: migrateItems(o.items) })),
    clinicId: ctx.clinicId,
  };
}

export async function saveOrder(
  currentOrderId: string | null,
  items: ShoppingItem[],
  totalAmount: number,
  invoiceUrl: string | null,
): Promise<void> {
  const ctx = await getClinicId();
  if (!ctx) throw new Error('Usuário não autenticado');

  if (currentOrderId) {
    await (supabase.from('shopping_orders') as any)
      .update({ items, total_amount: totalAmount, invoice_url: invoiceUrl })
      .eq('id', currentOrderId);
  } else {
    await (supabase.from('shopping_orders') as any)
      .insert([{
        clinic_id: ctx.clinicId,
        items,
        total_amount: totalAmount,
        status: 'pending',
        created_by: ctx.userId,
        invoice_url: invoiceUrl,
      }]);
  }
}

export async function completeOrder(
  currentOrderId: string | null,
  purchasedItems: ShoppingItem[],
  purchasedTotal: number,
  invoiceUrl: string | null,
): Promise<string | null> {
  const ctx = await getClinicId();
  if (!ctx) throw new Error('Usuário não autenticado');

  if (currentOrderId) {
    await (supabase.from('shopping_orders') as any)
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        items: purchasedItems,
        total_amount: purchasedTotal,
        invoice_url: invoiceUrl,
      })
      .eq('id', currentOrderId);
    return currentOrderId;
  }

  const { data: newOrder } = await (supabase.from('shopping_orders') as any)
    .insert([{
      clinic_id: ctx.clinicId,
      items: purchasedItems,
      total_amount: purchasedTotal,
      status: 'completed',
      created_by: ctx.userId,
      completed_at: new Date().toISOString(),
      invoice_url: invoiceUrl,
    }])
    .select('id')
    .single();

  return newOrder?.id ?? null;
}

export async function createPendingOrder(
  items: ShoppingItem[],
  totalAmount: number,
): Promise<void> {
  const ctx = await getClinicId();
  if (!ctx) return;

  await (supabase.from('shopping_orders') as any)
    .insert([{
      clinic_id: ctx.clinicId,
      items,
      total_amount: totalAmount,
      status: 'pending',
      created_by: ctx.userId,
    }]);
}

export async function deleteOrder(orderId: string): Promise<void> {
  await (supabase.from('shopping_orders') as any)
    .delete()
    .eq('id', orderId);
}

export async function uploadInvoice(
  clinicId: string,
  file: File,
): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${clinicId}/materiais/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from('fiscal-documents').upload(path, file);
  if (error) throw error;

  // Return path only — resolve to signed URL at read time
  return path;
}

/**
 * Extract the storage path from any format:
 *  - Pure path: "clinicId/materiais/file.jpg" → "clinicId/materiais/file.jpg"
 *  - Public URL: "...storage/v1/object/public/fiscal-documents/clinicId/file.jpg" → "clinicId/file.jpg"
 *  - Signed URL: "...storage/v1/object/sign/fiscal-documents/clinicId/file.jpg?token=..." → "clinicId/file.jpg"
 */
function extractStoragePath(bucket: string, urlOrPath: string): string | null {
  // If it contains the bucket name in a URL, extract path after bucket (strip query string)
  const bucketPattern = new RegExp(`${bucket}/(.+?)(?:\\?|$)`);
  const match = urlOrPath.match(bucketPattern);
  if (match) return decodeURIComponent(match[1]);

  // If it doesn't look like a URL, it's already a path
  if (!urlOrPath.startsWith('http') && !urlOrPath.startsWith('//')) {
    return urlOrPath;
  }

  return null;
}

export async function deleteInvoice(invoiceUrl: string, orderId: string): Promise<void> {
  const path = extractStoragePath('fiscal-documents', invoiceUrl);
  if (path) {
    await supabase.storage.from('fiscal-documents').remove([path]);
  }

  await (supabase.from('shopping_orders') as any)
    .update({ invoice_url: null })
    .eq('id', orderId);
}

export async function attachInvoiceToOrder(
  clinicId: string,
  orderId: string,
  file: File,
): Promise<string> {
  const url = await uploadInvoice(clinicId, file);

  await (supabase.from('shopping_orders') as any)
    .update({ invoice_url: url })
    .eq('id', orderId);

  return url;
}

export async function removeInvoiceFile(invoiceUrl: string): Promise<void> {
  const path = extractStoragePath('fiscal-documents', invoiceUrl);
  if (path) {
    await supabase.storage.from('fiscal-documents').remove([path]);
  }
}
