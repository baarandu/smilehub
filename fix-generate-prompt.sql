-- Fix for generate_ai_secretary_prompt function
-- Handles empty arrays properly

CREATE OR REPLACE FUNCTION generate_ai_secretary_prompt(p_instance_name TEXT)
RETURNS TEXT AS $$
DECLARE
    v_config JSON;
    v_prompt TEXT;
    v_professionals_text TEXT;
    v_procedures_text TEXT;
    v_professional RECORD;
    v_procedure RECORD;
    v_work_days TEXT[];
    v_closed_days TEXT[];
    v_insurance_text TEXT;
BEGIN
    -- Get config
    v_config := get_ai_secretary_config(p_instance_name);

    IF NOT (v_config->>'found')::boolean THEN
        RETURN 'ERROR: ' || COALESCE(v_config->>'error', 'Clinic not found');
    END IF;

    -- Build professionals list (with null/empty check)
    v_professionals_text := '';
    IF v_config->'professionals' IS NOT NULL
       AND json_typeof(v_config->'professionals') = 'array'
       AND json_array_length(v_config->'professionals') > 0 THEN
        FOR v_professional IN SELECT * FROM json_array_elements(v_config->'professionals')
        LOOP
            v_professionals_text := v_professionals_text || '- ' ||
                COALESCE(v_professional.value->>'name', 'N/A') || ' - ' ||
                COALESCE(v_professional.value->>'profession', 'N/A') || ' - ' ||
                COALESCE(v_professional.value->>'specialty', 'N/A') || ' (' ||
                COALESCE(v_professional.value->>'google_calendar_id', 'sem agenda') || ')' || E'\n';
        END LOOP;
    END IF;

    IF v_professionals_text = '' THEN
        v_professionals_text := '(Nenhum profissional cadastrado com Google Calendar)';
    END IF;

    -- Build procedures list (with null/empty check)
    v_procedures_text := '';
    IF v_config->'procedures' IS NOT NULL
       AND json_typeof(v_config->'procedures') = 'array'
       AND json_array_length(v_config->'procedures') > 0 THEN
        FOR v_procedure IN SELECT * FROM json_array_elements(v_config->'procedures')
        LOOP
            v_procedures_text := v_procedures_text || '- ' ||
                COALESCE(v_procedure.value->>'name', 'N/A') ||
                CASE WHEN v_procedure.value->>'price' IS NOT NULL
                    THEN ' - R$ ' || (v_procedure.value->>'price')
                    ELSE ''
                END || E'\n';
        END LOOP;
    END IF;

    IF v_procedures_text = '' THEN
        v_procedures_text := '(Consultar valores na recepção)';
    END IF;

    -- Build insurance text
    v_insurance_text := '';
    IF v_config->'payment'->'insurance' IS NOT NULL
       AND json_typeof(v_config->'payment'->'insurance') = 'array'
       AND json_array_length(v_config->'payment'->'insurance') > 0 THEN
        SELECT string_agg(value::text, ', ') INTO v_insurance_text
        FROM json_array_elements_text(v_config->'payment'->'insurance');
    ELSE
        v_insurance_text := 'Não trabalhamos com convênios';
    END IF;

    -- Build work days text
    v_work_days := ARRAY[]::TEXT[];
    v_closed_days := ARRAY[]::TEXT[];

    IF (v_config->'settings'->'work_days'->>'seg')::boolean THEN v_work_days := array_append(v_work_days, 'Seg'); ELSE v_closed_days := array_append(v_closed_days, 'Seg'); END IF;
    IF (v_config->'settings'->'work_days'->>'ter')::boolean THEN v_work_days := array_append(v_work_days, 'Ter'); ELSE v_closed_days := array_append(v_closed_days, 'Ter'); END IF;
    IF (v_config->'settings'->'work_days'->>'qua')::boolean THEN v_work_days := array_append(v_work_days, 'Qua'); ELSE v_closed_days := array_append(v_closed_days, 'Qua'); END IF;
    IF (v_config->'settings'->'work_days'->>'qui')::boolean THEN v_work_days := array_append(v_work_days, 'Qui'); ELSE v_closed_days := array_append(v_closed_days, 'Qui'); END IF;
    IF (v_config->'settings'->'work_days'->>'sex')::boolean THEN v_work_days := array_append(v_work_days, 'Sex'); ELSE v_closed_days := array_append(v_closed_days, 'Sex'); END IF;
    IF (v_config->'settings'->'work_days'->>'sab')::boolean THEN v_work_days := array_append(v_work_days, 'Sáb'); ELSE v_closed_days := array_append(v_closed_days, 'Sáb'); END IF;
    IF (v_config->'settings'->'work_days'->>'dom')::boolean THEN v_work_days := array_append(v_work_days, 'Dom'); ELSE v_closed_days := array_append(v_closed_days, 'Dom'); END IF;

    -- Build prompt
    v_prompt := format('
HOJE É: {data_atual}
TELEFONE DO CONTATO: {telefone_paciente}

## INSTRUÇÃO IMPORTANTE
- Ao criar ou editar qualquer evento no Google Calendar, incluir sempre o telefone do paciente na descrição do agendamento, juntamente com o nome completo, data de nascimento e quaisquer outras informações relevantes fornecidas pelo paciente.

-----------------------

## PAPEL

Você é uma atendente do WhatsApp, altamente especializada, que atua em nome da %s, prestando um serviço de excelência. Sua missão é atender aos pacientes de maneira ágil e eficiente, respondendo dúvidas e auxiliando em agendamentos, cancelamentos ou remarcações de consultas.

## PERSONALIDADE E TOM DE VOZ

- Simpática, prestativa e humana
- Tom de voz %s, acolhedor e respeitoso

## OBJETIVO

1. Fornecer atendimento diferenciado e cuidadoso aos pacientes.
2. Responder dúvidas sobre a clínica (especialidade, horários, localização, formas de pagamento).
3. Agendar, remarcar e cancelar consultas de forma simples e eficaz.
4. Agir passo a passo para garantir rapidez e precisão em cada atendimento.

-----------------------

## SOP (Procedimento Operacional Padrão)

1. Início do atendimento e identificação de interesse em agendar
   - Cumprimente o paciente de forma acolhedora.
   - Se possível, incentive o envio de áudio caso o paciente prefira, destacando a praticidade

2. Solicitar dados do paciente
   - Peça nome completo e data de nascimento.
   - Confirme o telefone de contato que chegou na mensagem.
   - Ao falar o telefone para o paciente, remova o código do país (geralmente "55"), e formate como "(11) 1234-5678"

3. Identificar necessidade
   - Pergunte a data de preferência para a consulta e se o paciente tem preferência por algum turno (manhã ou tarde).

4. Verificar disponibilidade
   - Use a ferramenta de busca de eventos apenas após ter todos os dados necessários do paciente.
   - Forneça a data de preferência para obter horários disponíveis.

5. Informar disponibilidade
   - Retorne ao paciente com os horários livres encontrados para a data solicitada.

6. Agendar consulta
   - Após confirmação do paciente, crie o evento incluindo:
     - Nome completo
     - Data de nascimento
     - Telefone de contato
     - Data e hora escolhidas
   - Nunca agende datas ou horários passados, ou com conflitos.

7. Confirmar agendamento
   - Espere o retorno de sucesso da ferramenta e então confirme com o paciente.

-----------------------

## INSTRUÇÕES GERAIS

1. Respostas claras, objetivas e úteis
2. Sem diagnósticos ou opiniões médicas - use "Escalar_humano" se insistirem
3. Pacientes insatisfeitos - mantenha empatia e use "Escalar_humano"
4. Assuntos fora do escopo - direcione para atendimento humano
5. Nunca fornecer informações erradas
6. %s
7. Nunca confirme consultas sem retorno de sucesso das ferramentas
8. Dupla verificação - confirme sempre os dados
9. Use a ferramenta "Refletir" antes e depois de operações complexas

-----------------------

## HORÁRIOS DE FUNCIONAMENTO
- %s: %s às %s
- Fechado: %s

## LOCALIZAÇÃO E CONTATO
- Endereço: %s
- Telefone: %s
- WhatsApp: %s
- E-mail: %s
- Site: %s

## PROFISSIONAIS E ESPECIALIDADES

**IMPORTANTE: O ID DA AGENDA INCLUI O "@group.calendar.google.com". NÃO OMITA AO UTILIZAR AS FERRAMENTAS**

%s

## PROCEDIMENTOS

%s

## FORMAS DE PAGAMENTO
%s

## CONVÊNIOS
%s
',
        COALESCE(v_config->>'clinic_name', 'Clínica'),
        COALESCE(v_config->'settings'->>'tone', 'profissional'),
        CASE WHEN COALESCE(v_config->'behavior'->>'accept_audio_messages', 'true')::boolean
            THEN 'Aceite mensagens de áudio e responda normalmente'
            ELSE 'NÃO aceite mensagens de áudio - peça para o paciente enviar texto'
        END,
        array_to_string(v_work_days, ', '),
        COALESCE(v_config->'settings'->>'work_hours_start', '08:00'),
        COALESCE(v_config->'settings'->>'work_hours_end', '18:00'),
        CASE WHEN array_length(v_closed_days, 1) > 0 THEN array_to_string(v_closed_days, ', ') ELSE 'Nenhum' END,
        COALESCE(v_config->'contact'->>'address', 'Não informado'),
        COALESCE(v_config->'contact'->>'phone', 'Não informado'),
        COALESCE(v_config->'contact'->>'whatsapp', 'Não informado'),
        COALESCE(v_config->'contact'->>'email', 'Não informado'),
        COALESCE(v_config->'contact'->>'website', 'Não informado'),
        v_professionals_text,
        v_procedures_text,
        COALESCE(
            (SELECT string_agg(value::text, ', ') FROM json_array_elements_text(v_config->'payment'->'methods')),
            'PIX, Dinheiro, Cartão'
        ),
        v_insurance_text
    );

    RETURN v_prompt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION generate_ai_secretary_prompt(TEXT) TO anon, authenticated, service_role;
