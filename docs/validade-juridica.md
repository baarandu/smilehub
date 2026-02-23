## Validade Jurídica do Organiza Odonto

O **Organiza Odonto** foi projetado com uma arquitetura de conformidade legal de nível pericial, atendendo às exigências da legislação brasileira aplicável à saúde digital, proteção de dados e documentação clínica odontológica. A seguir, detalhamos os mecanismos implementados que sustentam a validade jurídica da plataforma.

---

### 1. Assinatura Digital de Prontuários Clínicos

O sistema implementa um fluxo completo de assinatura eletrônica em duas camadas, conforme previsto na **MP 2.200-2/2001** e na **Lei 14.063/2020**:

**Assinatura do Paciente (Eletrônica Avançada):**
Após cada atendimento, o paciente assina digitalmente o registro clínico (procedimento, anamnese ou exame) por meio de um processo que garante identificação, integridade e não-repúdio:

- **Verificação de identidade via OTP**: Um código de 6 dígitos é enviado ao e-mail do paciente, com validade de 10 minutos e limite de 5 tentativas. O código é armazenado em formato hash SHA-256 (nunca em texto puro), e toda a cadeia — envio, verificação, IP, user-agent — é registrada de forma imutável.
- **Assinatura em canvas**: Após a verificação OTP, o paciente assina com o dedo (mobile) ou mouse, gerando imagem PNG armazenada em bucket privado sem permissão de exclusão.
- **Hash de conteúdo SHA-256**: No momento da assinatura, o conteúdo do prontuário é canonicalizado (campos ordenados alfabeticamente, valores normalizados) e um hash SHA-256 é gerado tanto no frontend quanto recalculado no backend. Se houver divergência, a assinatura é rejeitada — garantindo que o conteúdo assinado é exatamente o que consta no banco de dados.
- **Registro forense**: Cada assinatura inclui IP do signatário, user-agent, timestamp do servidor, hash verificado, identificador do desafio OTP e nome do assinante.

**Assinatura do Dentista (ICP-Brasil — Qualificada):**
Uma vez por mês, o dentista acessa a página de assinatura em lote, seleciona os prontuários do período e gera um PDF consolidado contendo:

- Numeração sequencial (LOTE-YYYY-MM-NNN)
- Tabela com paciente, data, tipo de registro, descrição e hash SHA-256 individual
- Identificação do dentista (nome e CRO)
- Hash do próprio documento e data/hora do servidor

O PDF é então assinado com certificado digital ICP-Brasil via integração SuperSign, conferindo validade jurídica qualificada nos termos do Art. 10, §1º da MP 2.200-2/2001.

**Para pacientes menores de idade**, o OTP é automaticamente enviado ao e-mail do responsável legal cadastrado, e a assinatura é registrada como "Responsável Legal".

---

### 2. Imutabilidade e Versionamento de Prontuários

Em conformidade com a **Lei 13.787/2007** e a **Resolução CFO 118/2012**:

- **Registros clínicos nunca são excluídos**: Procedimentos, anamneses e exames utilizam soft-delete (arquivamento), com triggers no banco de dados que bloqueiam qualquer tentativa de hard-delete.
- **Assinaturas são imutáveis**: Triggers PostgreSQL impedem UPDATE e DELETE em registros de assinatura — apenas INSERT é permitido.
- **Versionamento automático**: Se um registro já assinado for editado, o sistema automaticamente cria um snapshot completo da versão anterior na tabela `clinical_record_versions`, incluindo o hash original. A assinatura é marcada como invalidada e uma nova coleta é exigida.
- **Retenção mínima de 20 anos**: Prontuários clínicos possuem trava de retenção (`retention_locked_until`), impedindo exclusão ou anonimização dentro do prazo legal.

---

### 3. Conformidade LGPD (Lei 13.709/2018)

O Organiza Odonto implementa integralmente os direitos do titular previstos nos Artigos 17 a 22:

- **Direito de Acesso e Portabilidade (Art. 18, V)**: Exportação completa dos dados do paciente em três formatos — JSON (dados brutos), CSV (multi-seção com cabeçalhos) e PDF (80+ campos traduzidos para pt-BR, com rodapé contendo ID do documento e hash SHA-256).
- **Direito de Anonimização (Art. 18, IV)**: Processo irreversível que substitui nome por "PACIENTE ANONIMIZADO", nulifica dados pessoais, anonimiza transcrições de voz. Exige dupla confirmação (código + checkbox) e justificativa documentada se dentro do período de retenção clínica.
- **Consentimento Granular (Art. 7-8)**: Tabela `patient_consents` rastreia consentimento por paciente, por tipo (análise IA, exportação, processamento de menor), com IP, timestamp e nome do responsável. O paciente pode revogar a qualquer momento via toggle na interface.
- **Consentimento de Menores (Art. 14)**: Sistema dedicado com validação fail-closed — sem registro de consentimento do responsável, nenhum processamento de IA é realizado. Badge visual no cabeçalho do paciente indica o status.
- **Retenção e Descarte (Art. 15-16)**: Política automatizada via pg_cron — sessões de voz (90 dias), conversas de IA (180 dias), rate limits (1 dia), logs de auditoria (2 anos). Dados clínicos respeitam o prazo legal de 20 anos; dados fiscais, 5 anos.
- **Notificação de Incidentes (Art. 48)**: Procedimento documentado em 5 fases com template de notificação à ANPD em 72 horas.

---

### 4. Trilha de Auditoria Imutável

Toda ação relevante é registrada em uma trilha de auditoria com proteção forense:

- **Logs imutáveis**: Tabela `audit_logs` aceita apenas INSERT — triggers bloqueiam UPDATE e DELETE.
- **Rastreabilidade completa**: Cada entrada inclui IP do cliente, user-agent, ID da requisição, função de origem, tipo de evento (AUTH_FAILURE, AI_REQUEST, CONSENT_DENIED, EXPORT, etc.) e timestamp do servidor.
- **Retenção de 2 anos**: Limpeza automatizada via pg_cron preserva os registros pelo período regulatório.
- **Dashboard de Segurança**: Painel administrativo (`/admin/seguranca`) com métricas, gráficos de eventos e tabela de logs filtrável — exclusivo para administradores.
- **12 Edge Functions auditadas**: Todas as funções críticas (autenticação, IA, exportação, assinaturas, convites, pagamentos) geram eventos de auditoria estruturados.

---

### 5. Criptografia e Proteção de Dados Sensíveis

- **Dados em trânsito**: TLS 1.2+ em todas as conexões, com headers HSTS e CSP configurados.
- **Dados em repouso**: CPF e RG criptografados com AES-256 via pgcrypto diretamente no PostgreSQL. A chave de criptografia é protegida por RLS + REVOKE, inacessível via API.
- **Isolamento multi-tenant**: Row Level Security (RLS) em 30+ tabelas garante que cada clínica acessa exclusivamente seus dados.
- **Transcrições de voz**: Armazenadas em coluna criptografada (bytea) com acesso via RPC protegido.

---

### 6. Segurança de IA e Proteção contra Injeção

- **Anonimização para IA**: CPF, RG, telefone, e-mail e endereço são removidos antes de qualquer envio à OpenAI. Nomes são substituídos por identificadores genéricos ("Paciente 1", "Paciente 2").
- **Anti-injeção de prompt**: 8 padrões de ataque detectados e bloqueados em modo ativo nos agentes clínicos e financeiros.
- **Consentimento obrigatório**: Processamento de IA opera em modo fail-closed — sem consentimento explícito do paciente, nenhuma análise é realizada.
- **Sem treinamento de modelos**: Os dados dos pacientes não são utilizados para treinamento de modelos de IA (configuração zero-day retention na OpenAI).

---

### 7. Documentação Regulatória Publicada

O sistema disponibiliza, de forma acessível dentro da própria plataforma:

| Documento | Referência Legal |
|-----------|-----------------|
| **Termos de Uso** | CDC Art. 49, MP 2.200-2, Lei 14.063 |
| **Política de Privacidade** | LGPD Art. 6-22 |
| **Acordo de Processamento de Dados (DPA)** | LGPD Art. 37-39 |
| **Política de Segurança da Informação** | LGPD Art. 46-47 |
| **RIPD** (Relatório de Impacto) | LGPD Art. 38 |
| **Matriz de Risco LGPD** | 18 riscos mapeados em 5 categorias |
| **Plano de Recuperação de Desastres** | RPO/RTO por componente |
| **Procedimento de Resposta a Incidentes** | LGPD Art. 48, 72h ANPD |
| **Checklist de Conformidade** | 73 itens (anual/trimestral/contínuo) |
| **5 Modelos de TCLE** | Implante, clareamento, cirurgia oral, ortodontia, prótese |

---

### 8. Aceite de Termos com Validade Jurídica

O sistema registra o aceite de termos de uso e política de privacidade com:

- Versão do documento aceito
- IP do usuário no momento do aceite
- User-agent do dispositivo
- Timestamp do servidor
- Modal não-descartável que exige re-aceite a cada nova versão

Conforme Art. 10, §2º da MP 2.200-2/2001, a identificação do usuário registrado, combinada com data, hora, IP e verificação OTP, constitui assinatura eletrônica válida.

---

### 9. Base Legal Consolidada

O Organiza Odonto fundamenta-se na seguinte legislação:

- **MP 2.200-2/2001**: Infraestrutura de Chaves Públicas (ICP-Brasil) e validade de documentos eletrônicos
- **Lei 14.063/2020**: Uso de assinaturas eletrônicas em interações com entes públicos e em atos de saúde
- **Lei 13.709/2018 (LGPD)**: Proteção de dados pessoais
- **Lei 13.787/2007**: Digitalização e guarda de prontuários
- **Resolução CFO 118/2012**: Normas para prontuário odontológico
- **Código de Defesa do Consumidor**: Direito de arrependimento (Art. 49)

---

### Conclusão

O Organiza Odonto oferece uma infraestrutura de conformidade classificada como **Nota A+**, com 55 de 73 itens de auditoria plenamente implementados e 7 em andamento. A combinação de assinatura eletrônica avançada do paciente (OTP + canvas + hash SHA-256), assinatura qualificada ICP-Brasil do dentista, trilha de auditoria imutável, criptografia de dados sensíveis e conformidade integral com a LGPD confere aos prontuários digitais gerados pela plataforma **validade jurídica equivalente ou superior aos prontuários em papel**, com a vantagem adicional de rastreabilidade, integridade verificável e proteção contra adulteração.
