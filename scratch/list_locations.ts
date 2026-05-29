
import { supabase } from './src/lib/supabase';
import { getClinicContext } from './src/services/clinicContext';

async function listLocations() {
  try {
    const { clinicId } = await getClinicContext();
    console.log('Clinic ID:', clinicId);
    
    const { data, error } = await supabase
      .from('locations')
      .select('id, name, address, clinic_id')
      .eq('clinic_id', clinicId);

    if (error) {
      console.error('Error fetching locations:', error);
      return;
    }

    console.log('Locations found:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

listLocations();
