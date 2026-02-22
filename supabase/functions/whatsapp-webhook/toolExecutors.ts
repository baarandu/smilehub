/**
 * WhatsApp Webhook - Tool Executors
 * Each function calls the corresponding Supabase RPC.
 * Context (clinic_id, phone) comes from the webhook, not JWT.
 */

interface ToolContext {
  clinicId: string;
  phone: string; // Patient's phone from WhatsApp (remoteJid)
  conversationId: string;
}

interface ToolArgs {
  [key: string]: any;
}

export async function executeToolCall(
  toolName: string,
  args: ToolArgs,
  context: ToolContext,
  supabase: any
): Promise<any> {
  switch (toolName) {
    case "buscar_paciente":
      return await executeBuscarPaciente(context, supabase);

    case "cadastrar_paciente":
      return await executeCadastrarPaciente(args, context, supabase);

    case "listar_profissionais":
      return await executeListarProfissionais(context, supabase);

    case "buscar_horarios":
      return await executeBuscarHorarios(args, context, supabase);

    case "criar_agendamento":
      return await executeCriarAgendamento(args, context, supabase);

    case "minhas_consultas":
      return await executeMinhasConsultas(args, context, supabase);

    case "proximo_agendamento":
      return await executeProximoAgendamento(context, supabase);

    case "remarcar_agendamento":
      return await executeRemarcarAgendamento(args, context, supabase);

    case "cancelar_agendamento":
      return await executeCancelarAgendamento(args, context, supabase);

    case "confirmar_agendamento":
      return await executeConfirmarAgendamento(args, context, supabase);

    case "transferir_para_humano":
      return await executeTransferirParaHumano(args, context, supabase);

    default:
      throw new Error(`Ferramenta desconhecida: ${toolName}`);
  }
}

// 1. Buscar paciente pelo telefone do WhatsApp
async function executeBuscarPaciente(
  context: ToolContext,
  supabase: any
): Promise<any> {
  const { data, error } = await supabase.rpc("ai_find_patient_by_phone", {
    p_clinic_id: context.clinicId,
    p_phone: context.phone,
  });

  if (error) throw new Error(`Erro ao buscar paciente: ${error.message}`);
  return data;
}

// 2. Cadastrar novo paciente
async function executeCadastrarPaciente(
  args: ToolArgs,
  context: ToolContext,
  supabase: any
): Promise<any> {
  const { data, error } = await supabase.rpc("ai_create_patient", {
    p_clinic_id: context.clinicId,
    p_name: args.name,
    p_phone: context.phone,
    p_birth_date: args.birth_date || null,
    p_email: args.email || null,
    p_notes: "Cadastrado via Secretária IA (WhatsApp)",
  });

  if (error) throw new Error(`Erro ao cadastrar paciente: ${error.message}`);
  return data;
}

// 3. Listar profissionais disponíveis
async function executeListarProfissionais(
  context: ToolContext,
  supabase: any
): Promise<any> {
  const { data, error } = await supabase.rpc("ai_list_professionals", {
    p_clinic_id: context.clinicId,
  });

  if (error) throw new Error(`Erro ao listar profissionais: ${error.message}`);
  return data;
}

// 4. Buscar horários disponíveis
async function executeBuscarHorarios(
  args: ToolArgs,
  context: ToolContext,
  supabase: any
): Promise<any> {
  const { data, error } = await supabase.rpc("ai_get_available_slots", {
    p_clinic_id: context.clinicId,
    p_professional_id: args.professional_id,
    p_date: args.date,
    p_duration_minutes: args.duration_minutes || 30,
  });

  if (error) throw new Error(`Erro ao buscar horários: ${error.message}`);
  return data;
}

// 5. Criar agendamento
async function executeCriarAgendamento(
  args: ToolArgs,
  context: ToolContext,
  supabase: any
): Promise<any> {
  const { data, error } = await supabase.rpc("ai_create_appointment", {
    p_clinic_id: context.clinicId,
    p_patient_id: args.patient_id,
    p_professional_id: args.professional_id,
    p_date: args.date,
    p_time: args.time,
    p_procedure_name: args.procedure_name || null,
    p_notes: args.notes || "Agendado via Secretária IA (WhatsApp)",
  });

  if (error) throw new Error(`Erro ao criar agendamento: ${error.message}`);
  return data;
}

// 6. Minhas consultas (agendamentos do paciente)
async function executeMinhasConsultas(
  args: ToolArgs,
  context: ToolContext,
  supabase: any
): Promise<any> {
  const { data, error } = await supabase.rpc("ai_get_patient_appointments", {
    p_clinic_id: context.clinicId,
    p_patient_id: args.patient_id,
    p_include_past: args.include_past || false,
  });

  if (error) throw new Error(`Erro ao buscar consultas: ${error.message}`);
  return data;
}

// 7. Próximo agendamento (pelo telefone)
async function executeProximoAgendamento(
  context: ToolContext,
  supabase: any
): Promise<any> {
  const { data, error } = await supabase.rpc("ai_get_next_appointment", {
    p_clinic_id: context.clinicId,
    p_phone: context.phone,
  });

  if (error) throw new Error(`Erro ao buscar próximo agendamento: ${error.message}`);
  return data;
}

// 8. Remarcar agendamento
async function executeRemarcarAgendamento(
  args: ToolArgs,
  context: ToolContext,
  supabase: any
): Promise<any> {
  const { data, error } = await supabase.rpc("ai_reschedule_appointment", {
    p_clinic_id: context.clinicId,
    p_appointment_id: args.appointment_id,
    p_new_date: args.new_date,
    p_new_time: args.new_time,
    p_notes: args.notes || null,
  });

  if (error) throw new Error(`Erro ao remarcar agendamento: ${error.message}`);
  return data;
}

// 9. Cancelar agendamento
async function executeCancelarAgendamento(
  args: ToolArgs,
  context: ToolContext,
  supabase: any
): Promise<any> {
  const { data, error } = await supabase.rpc("ai_cancel_appointment", {
    p_clinic_id: context.clinicId,
    p_appointment_id: args.appointment_id,
    p_reason: args.reason || null,
  });

  if (error) throw new Error(`Erro ao cancelar agendamento: ${error.message}`);
  return data;
}

// 10. Confirmar agendamento
async function executeConfirmarAgendamento(
  args: ToolArgs,
  context: ToolContext,
  supabase: any
): Promise<any> {
  const { data, error } = await supabase.rpc("ai_confirm_appointment", {
    p_clinic_id: context.clinicId,
    p_appointment_id: args.appointment_id,
  });

  if (error) throw new Error(`Erro ao confirmar agendamento: ${error.message}`);
  return data;
}

// 11. Transferir para humano
async function executeTransferirParaHumano(
  args: ToolArgs,
  context: ToolContext,
  supabase: any
): Promise<any> {
  const { data, error } = await supabase.rpc("transfer_to_human", {
    p_conversation_id: context.conversationId,
    p_reason: args.reason || "Solicitado pelo paciente",
  });

  if (error) throw new Error(`Erro ao transferir para humano: ${error.message}`);
  return {
    success: data,
    message: data
      ? "Conversa transferida para atendimento humano."
      : "Erro ao transferir conversa.",
  };
}
