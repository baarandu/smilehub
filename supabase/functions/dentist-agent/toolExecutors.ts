interface ToolArgs {
  [key: string]: any;
}

export async function executeToolCall(
  toolName: string,
  args: ToolArgs,
  clinicId: string,
  supabase: any
): Promise<any> {
  console.log(`Executing tool: ${toolName}`, args);

  switch (toolName) {
    case "get_patient_profile":
      return await executeGetPatientProfile(args, clinicId, supabase);

    case "get_patient_anamnesis":
      return await executeGetPatientAnamnesis(args, clinicId, supabase);

    case "get_patient_procedures":
      return await executeGetPatientProcedures(args, clinicId, supabase);

    case "get_patient_exams":
      return await executeGetPatientExams(args, clinicId, supabase);

    case "get_patient_consultations":
      return await executeGetPatientConsultations(args, clinicId, supabase);

    case "get_patient_appointments":
      return await executeGetPatientAppointments(args, clinicId, supabase);

    case "search_patients":
      return await executeSearchPatients(args, clinicId, supabase);

    case "analyze_exam_image":
      return await executeAnalyzeExamImage(args, clinicId, supabase);

    case "get_patient_budgets":
      return await executeGetPatientBudgets(args, clinicId, supabase);

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// Helper: calculate age from birth date
function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// Tool 1: Get Patient Profile (LGPD-safe — no CPF/RG)
async function executeGetPatientProfile(
  args: ToolArgs,
  clinicId: string,
  supabase: any
): Promise<any> {
  const { patient_id } = args;

  const { data, error } = await supabase
    .from("patients")
    .select("id, name, birth_date, phone, email, health_insurance, health_insurance_number, allergies, medications, medical_history, notes, occupation")
    .eq("id", patient_id)
    .eq("clinic_id", clinicId)
    .single();

  if (error) {
    console.error("Error in get_patient_profile:", error);
    throw new Error(`Erro ao buscar perfil do paciente: ${error.message}`);
  }

  if (!data) {
    return { error: "Paciente não encontrado nesta clínica." };
  }

  return {
    id: data.id,
    name: data.name,
    age: data.birth_date ? calculateAge(data.birth_date) : null,
    phone: data.phone || null,
    email: data.email || null,
    insurance: data.health_insurance || "Particular",
    insurance_number: data.health_insurance_number || null,
    allergies: data.allergies || "Nenhuma registrada",
    medications: data.medications || "Nenhuma registrada",
    medical_history: data.medical_history || null,
    occupation: data.occupation || null,
    notes: data.notes || null,
  };
}

// Tool 2: Get Patient Anamnesis (only true fields to save tokens)
async function executeGetPatientAnamnesis(
  args: ToolArgs,
  clinicId: string,
  supabase: any
): Promise<any> {
  const { patient_id } = args;

  // Verify patient belongs to clinic
  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("id", patient_id)
    .eq("clinic_id", clinicId)
    .single();

  if (!patient) {
    return { error: "Paciente não encontrado nesta clínica." };
  }

  const { data, error } = await supabase
    .from("anamneses")
    .select("*")
    .eq("patient_id", patient_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error in get_patient_anamnesis:", error);
    throw new Error(`Erro ao buscar anamnese: ${error.message}`);
  }

  if (!data) {
    return {
      has_anamnesis: false,
      message: "Paciente não possui anamnese registrada. RECOMENDADO: preencher antes de prosseguir com tratamento.",
    };
  }

  // Anamnesis boolean fields and their labels (must match actual DB column names)
  const fields: [string, string, string][] = [
    ["diabetes", "diabetes_details", "Diabetes"],
    ["hypertension", "hypertension_details", "Hipertensão"],
    ["heart_disease", "heart_disease_details", "Doença Cardíaca"],
    ["allergy", "allergy_details", "Alergia"],
    ["drug_allergy", "drug_allergy_details", "Alergia Medicamentosa"],
    ["current_medication", "current_medication_details", "Medicação em Uso"],
    ["continuous_medication", "continuous_medication_details", "Medicação Contínua"],
    ["medical_treatment", "medical_treatment_details", "Em Tratamento Médico"],
    ["pregnant_or_breastfeeding", "pregnant_or_breastfeeding_details", "Gestante/Lactante"],
    ["smoker_or_drinker", "smoker_or_drinker_details", "Fumante/Etilista"],
    ["pacemaker", "pacemaker_details", "Marcapasso"],
    ["healing_problems", "healing_problems_details", "Problemas de Cicatrização"],
    ["recent_surgery", "recent_surgery_details", "Cirurgia Recente"],
    ["respiratory_problems", "respiratory_problems_details", "Problemas Respiratórios"],
    ["gastritis_reflux", "gastritis_reflux_details", "Gastrite/Refluxo"],
    ["seizure_epilepsy", "seizure_epilepsy_details", "Epilepsia/Convulsão"],
    ["depression_anxiety_panic", "depression_anxiety_panic_details", "Depressão/Ansiedade/Pânico"],
    ["arthritis", "arthritis_details", "Artrite/Artrose"],
    ["infectious_disease", "infectious_disease_details", "Doença Infecciosa"],
    ["anesthesia_reaction", "anesthesia_reaction_details", "Reação a Anestesia"],
    ["local_anesthesia_history", "local_anesthesia_history_details", "Histórico de Anestesia Local"],
    ["bruxism_dtm_orofacial_pain", "bruxism_dtm_orofacial_pain_details", "Bruxismo/DTM/Dor Orofacial"],
    ["fasting", "fasting_details", "Jejum"],
  ];

  // Only return true fields to save tokens
  const activeConditions: { condition: string; details: string }[] = [];
  for (const [boolField, detailField, label] of fields) {
    if (data[boolField]) {
      activeConditions.push({
        condition: label,
        details: data[detailField] || "Sem detalhes informados",
      });
    }
  }

  return {
    has_anamnesis: true,
    anamnesis_date: data.created_at,
    active_conditions: activeConditions,
    conditions_count: activeConditions.length,
    observations: data.observations || null,
    notes: data.notes || null,
    summary: activeConditions.length === 0
      ? "Nenhuma condição médica relevante registrada na anamnese."
      : `${activeConditions.length} condição(ões) ativa(s): ${activeConditions.map(c => c.condition).join(", ")}.`,
  };
}

// Tool 3: Get Patient Procedures
async function executeGetPatientProcedures(
  args: ToolArgs,
  clinicId: string,
  supabase: any
): Promise<any> {
  const { patient_id } = args;

  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("id", patient_id)
    .eq("clinic_id", clinicId)
    .single();

  if (!patient) {
    return { error: "Paciente não encontrado nesta clínica." };
  }

  const { data, error } = await supabase
    .from("procedures")
    .select("id, description, status, date, value, payment_method, location, created_at")
    .eq("patient_id", patient_id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("Error in get_patient_procedures:", error);
    throw new Error(`Erro ao buscar procedimentos: ${error.message}`);
  }

  const procedures = data || [];

  return {
    procedures,
    summary: {
      total: procedures.length,
      completed: procedures.filter((p: any) => p.status === "completed").length,
      in_progress: procedures.filter((p: any) => p.status === "in_progress").length,
      planned: procedures.filter((p: any) => p.status === "planned").length,
    },
  };
}

// Tool 4: Get Patient Exams
async function executeGetPatientExams(
  args: ToolArgs,
  clinicId: string,
  supabase: any
): Promise<any> {
  const { patient_id } = args;

  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("id", patient_id)
    .eq("clinic_id", clinicId)
    .single();

  if (!patient) {
    return { error: "Paciente não encontrado nesta clínica." };
  }

  const { data, error } = await supabase
    .from("exams")
    .select("id, type, name, title, description, file_url, file_urls, file_type, date, exam_date, created_at")
    .eq("patient_id", patient_id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Error in get_patient_exams:", error);
    throw new Error(`Erro ao buscar exames: ${error.message}`);
  }

  return {
    exams: data || [],
    total: (data || []).length,
  };
}

// Tool 5: Get Patient Consultations
async function executeGetPatientConsultations(
  args: ToolArgs,
  clinicId: string,
  supabase: any
): Promise<any> {
  const { patient_id } = args;

  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("id", patient_id)
    .eq("clinic_id", clinicId)
    .single();

  if (!patient) {
    return { error: "Paciente não encontrado nesta clínica." };
  }

  const { data, error } = await supabase
    .from("consultations")
    .select("id, notes, date, suggested_return_date, created_at")
    .eq("patient_id", patient_id)
    .order("created_at", { ascending: false })
    .limit(15);

  if (error) {
    console.error("Error in get_patient_consultations:", error);
    throw new Error(`Erro ao buscar consultas: ${error.message}`);
  }

  return {
    consultations: data || [],
    total: (data || []).length,
  };
}

// Tool 6: Get Patient Appointments
async function executeGetPatientAppointments(
  args: ToolArgs,
  clinicId: string,
  supabase: any
): Promise<any> {
  const { patient_id } = args;

  const { data, error } = await supabase
    .from("appointments")
    .select("id, date, time, status, procedure_name, notes, location")
    .eq("patient_id", patient_id)
    .eq("clinic_id", clinicId)
    .order("date", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Error in get_patient_appointments:", error);
    throw new Error(`Erro ao buscar agendamentos: ${error.message}`);
  }

  const appointments = data || [];

  return {
    appointments,
    summary: {
      total: appointments.length,
      completed: appointments.filter((a: any) => a.status === "completed").length,
      scheduled: appointments.filter((a: any) => a.status === "scheduled").length,
      missed: appointments.filter((a: any) => a.status === "missed" || a.status === "no_show").length,
    },
  };
}

// Tool 7: Search Patients (LGPD-safe — no CPF/RG)
async function executeSearchPatients(
  args: ToolArgs,
  clinicId: string,
  supabase: any
): Promise<any> {
  const { search_term } = args;

  const { data, error } = await supabase
    .from("patients")
    .select("id, name, birth_date, phone")
    .eq("clinic_id", clinicId)
    .ilike("name", `%${search_term}%`)
    .limit(10);

  if (error) {
    console.error("Error in search_patients:", error);
    throw new Error(`Erro ao buscar pacientes: ${error.message}`);
  }

  const patients = (data || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    age: p.birth_date ? calculateAge(p.birth_date) : null,
    phone: p.phone || null,
  }));

  return {
    patients,
    total: patients.length,
    message: patients.length === 0
      ? `Nenhum paciente encontrado com "${search_term}".`
      : `${patients.length} paciente(s) encontrado(s).`,
  };
}

// Tool 8: Analyze Exam Image
async function executeAnalyzeExamImage(
  args: ToolArgs,
  clinicId: string,
  supabase: any
): Promise<any> {
  const { exam_id } = args;

  const { data, error } = await supabase
    .from("exams")
    .select("id, type, name, title, description, file_url, file_urls, date, exam_date, created_at, patient_id")
    .eq("id", exam_id)
    .single();

  if (error) {
    console.error("Error in analyze_exam_image:", error);
    throw new Error(`Erro ao buscar exame: ${error.message}`);
  }

  if (!data) {
    return { error: "Exame não encontrado." };
  }

  // Verify patient belongs to clinic
  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("id", data.patient_id)
    .eq("clinic_id", clinicId)
    .single();

  if (!patient) {
    return { error: "Exame não pertence a um paciente desta clínica." };
  }

  // Collect all available image URLs
  const imageUrls: string[] = [];
  if (data.file_url) imageUrls.push(data.file_url);
  if (data.file_urls && Array.isArray(data.file_urls)) {
    imageUrls.push(...data.file_urls);
  }

  if (imageUrls.length === 0) {
    return {
      error: "Exame não possui imagem anexada.",
      exam_info: {
        type: data.type || data.name || "Não especificado",
        title: data.title || null,
        date: data.exam_date || data.date || data.created_at,
      },
    };
  }

  return {
    image_urls: imageUrls,
    exam_info: {
      type: data.type || data.name || "Não especificado",
      title: data.title || null,
      description: data.description || null,
      date: data.exam_date || data.date || data.created_at,
    },
    requires_vision: true,
  };
}

// Tool 9: Get Patient Budgets
async function executeGetPatientBudgets(
  args: ToolArgs,
  clinicId: string,
  supabase: any
): Promise<any> {
  const { patient_id } = args;

  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("id", patient_id)
    .eq("clinic_id", clinicId)
    .single();

  if (!patient) {
    return { error: "Paciente não encontrado nesta clínica." };
  }

  const { data, error } = await supabase
    .from("budgets")
    .select("id, status, value, treatment, notes, date, created_at, budget_items(id, tooth, faces)")
    .eq("patient_id", patient_id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error in get_patient_budgets:", error);
    throw new Error(`Erro ao buscar orçamentos: ${error.message}`);
  }

  const budgets = data || [];

  return {
    budgets,
    summary: {
      total: budgets.length,
      approved: budgets.filter((b: any) => b.status === "approved").length,
      pending: budgets.filter((b: any) => b.status === "pending").length,
      total_value: budgets.reduce((sum: number, b: any) => sum + (b.value || 0), 0),
    },
  };
}
