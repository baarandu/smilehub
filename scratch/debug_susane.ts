
import { supabase } from './src/lib/supabase';

async function debugSusane() {
  const patientName = 'Susane Reinert';
  
  // 1. Get patient ID
  const { data: patient } = await supabase
    .from('patients_secure')
    .select('id, name')
    .ilike('name', `%${patientName}%`)
    .single();

  if (!patient) {
    console.error('Patient not found');
    return;
  }
  console.log('Patient ID:', patient.id);

  // 2. Get transactions
  const { data: txs } = await supabase
    .from('financial_transactions')
    .select('id, description, date, amount, related_entity_id, tooth_index')
    .eq('patient_id', patient.id)
    .order('date', { ascending: false });

  console.log('Transactions:', JSON.stringify(txs, null, 2));

  // 3. Get NF-e docs
  const { data: docs } = await supabase
    .from('nfse_documents')
    .select('*')
    .eq('patient_id', patient.id);

  console.log('NF-e Docs:', JSON.stringify(docs, null, 2));
}

debugSusane();
