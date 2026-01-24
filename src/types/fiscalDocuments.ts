// Fiscal Documents Types for Income Tax and Accounting

// Tax regimes supported
export type TaxRegime = 'pf' | 'simples' | 'lucro_presumido' | 'lucro_real' | 'all';

// Main document categories
export type FiscalDocumentCategory =
    | 'identificacao'        // Identification documents
    | 'rendimentos'          // Income/Revenue documents
    | 'despesas'             // Expense documents
    | 'folha_pagamento'      // Payroll documents
    | 'impostos'             // Tax payment documents
    | 'bens_direitos'        // Assets and rights
    | 'dividas'              // Debts and financing
    | 'dependentes'          // Dependents (PF only)
    | 'especificos';         // Regime-specific documents

// Subcategories organized by main category
export interface FiscalDocumentSubcategories {
    identificacao:
        | 'cpf_rg'
        | 'comprovante_endereco'
        | 'dados_bancarios'
        | 'titulo_eleitor'
        | 'cnpj'
        | 'contrato_social'
        | 'alteracoes_contrato'
        | 'alvara'
        | 'inscricao_municipal'
        | 'licenca_vigilancia'
        | 'cro_pf'
        | 'cro_pj'
        | 'certificado_digital';

    rendimentos:
        | 'notas_fiscais_emitidas'
        | 'informes_convenios'
        | 'relatorios_maquininha'
        | 'rpas_emitidos'
        | 'informes_aplicacoes'
        | 'informes_alugueis'
        | 'livro_caixa';

    despesas:
        | 'aluguel_consultorio'
        | 'agua_luz_internet'
        | 'material_odontologico'
        | 'manutencao_equipamentos'
        | 'cursos_congressos'
        | 'anuidade_cro'
        | 'notas_compras_insumos'
        | 'notas_servicos'
        | 'contratos_servicos'
        | 'seguros'
        | 'despesas_medicas'
        | 'despesas_educacao'
        | 'pensao_alimenticia'
        | 'previdencia_privada'
        | 'doacoes_incentivadas';

    folha_pagamento:
        | 'holerites'
        | 'guias_fgts'
        | 'guias_gps_inss'
        | 'guias_irrf'
        | 'recibos_prolabore'
        | 'distribuicao_lucros'
        | 'rescisoes'
        | 'contratos_trabalho'
        | 'provisoes_ferias_13';

    impostos:
        | 'das_simples'
        | 'darf_irpj'
        | 'darf_csll'
        | 'darf_pis'
        | 'darf_cofins'
        | 'guia_iss'
        | 'carne_leao'
        | 'inss_autonomo';

    bens_direitos:
        | 'imoveis_escritura'
        | 'imoveis_matricula'
        | 'veiculos_crlv'
        | 'equipamentos_nf'
        | 'investimentos_extrato'
        | 'saldo_bancario';

    dividas:
        | 'financiamento_imovel'
        | 'financiamento_veiculo'
        | 'financiamento_equipamentos'
        | 'emprestimos_bancarios'
        | 'saldo_devedor';

    dependentes:
        | 'cpf_dependentes'
        | 'certidao_nascimento'
        | 'comprovante_guarda'
        | 'despesas_medicas_dep'
        | 'despesas_educacao_dep';

    especificos:
        // Simples Nacional
        | 'faturamento_mensal'
        | 'defis'
        | 'fator_r_calculo'
        // Lucro Presumido
        | 'balancete_trimestral'
        | 'retencoes_fonte_pcc'
        | 'retencoes_fonte_irrf'
        | 'dre'
        // Lucro Real
        | 'livro_diario'
        | 'livro_razao'
        | 'lalur'
        | 'lacs'
        | 'balanco_patrimonial'
        | 'controle_estoque'
        | 'inventario'
        | 'depreciacao_ativos'
        | 'creditos_pis_cofins';
}

// Database row type
export interface FiscalDocument {
    id: string;
    clinic_id: string;
    name: string;
    description: string | null;
    file_url: string;
    file_type: 'image' | 'pdf' | 'document';
    file_size: number;
    tax_regime: TaxRegime;
    category: FiscalDocumentCategory;
    subcategory: string | null;
    fiscal_year: number;
    reference_month: number | null;
    uploaded_by: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

// Insert type
export interface FiscalDocumentInsert {
    id?: string;
    clinic_id: string;
    name: string;
    description?: string | null;
    file_url: string;
    file_type?: 'image' | 'pdf' | 'document';
    file_size?: number;
    tax_regime: TaxRegime;
    category: FiscalDocumentCategory;
    subcategory?: string | null;
    fiscal_year: number;
    reference_month?: number | null;
    uploaded_by?: string | null;
    notes?: string | null;
}

// Update type
export interface FiscalDocumentUpdate {
    name?: string;
    description?: string | null;
    category?: FiscalDocumentCategory;
    subcategory?: string | null;
    fiscal_year?: number;
    reference_month?: number | null;
    notes?: string | null;
}

// Checklist item structure
export interface FiscalChecklistItem {
    category: FiscalDocumentCategory;
    subcategory: string;
    label: string;
    description: string;
    required: boolean;
    regimes: TaxRegime[];
    frequency: 'once' | 'monthly' | 'quarterly' | 'annual';
    documents?: FiscalDocument[];
    isComplete?: boolean;
}

// Checklist section
export interface FiscalChecklistSection {
    category: FiscalDocumentCategory;
    label: string;
    icon: string;
    items: FiscalChecklistItem[];
    completedCount: number;
    totalCount: number;
}

// Category labels and metadata
export const FISCAL_CATEGORY_LABELS: Record<FiscalDocumentCategory, string> = {
    identificacao: 'Identificação',
    rendimentos: 'Rendimentos / Faturamento',
    despesas: 'Despesas',
    folha_pagamento: 'Folha de Pagamento',
    impostos: 'Impostos Pagos',
    bens_direitos: 'Bens e Direitos',
    dividas: 'Dívidas',
    dependentes: 'Dependentes',
    especificos: 'Documentos Específicos',
};

export const TAX_REGIME_LABELS: Record<TaxRegime, string> = {
    pf: 'Pessoa Física',
    simples: 'Simples Nacional',
    lucro_presumido: 'Lucro Presumido',
    lucro_real: 'Lucro Real',
    all: 'Todos os Regimes',
};

// Complete checklist definition for all regimes
export const FISCAL_DOCUMENTS_CHECKLIST: FiscalChecklistItem[] = [
    // ===== IDENTIFICAÇÃO =====
    // PF
    { category: 'identificacao', subcategory: 'cpf_rg', label: 'CPF e RG', description: 'Documentos de identificação pessoal', required: true, regimes: ['pf'], frequency: 'once' },
    { category: 'identificacao', subcategory: 'comprovante_endereco', label: 'Comprovante de Endereço', description: 'Comprovante de endereço atualizado', required: true, regimes: ['pf', 'simples', 'lucro_presumido', 'lucro_real'], frequency: 'annual' },
    { category: 'identificacao', subcategory: 'dados_bancarios', label: 'Dados Bancários', description: 'Dados da conta para restituição', required: true, regimes: ['pf'], frequency: 'once' },
    { category: 'identificacao', subcategory: 'titulo_eleitor', label: 'Título de Eleitor', description: 'Exigido pela Receita Federal', required: false, regimes: ['pf'], frequency: 'once' },
    { category: 'identificacao', subcategory: 'cro_pf', label: 'Registro CRO', description: 'Registro no Conselho Regional de Odontologia', required: true, regimes: ['pf'], frequency: 'once' },
    { category: 'identificacao', subcategory: 'certificado_digital', label: 'Certificado Digital (e-CPF)', description: 'Para acesso ao e-CAC', required: true, regimes: ['pf'], frequency: 'annual' },

    // PJ
    { category: 'identificacao', subcategory: 'cnpj', label: 'Cartão CNPJ', description: 'Comprovante de inscrição CNPJ', required: true, regimes: ['simples', 'lucro_presumido', 'lucro_real'], frequency: 'once' },
    { category: 'identificacao', subcategory: 'contrato_social', label: 'Contrato Social', description: 'Contrato social consolidado', required: true, regimes: ['simples', 'lucro_presumido', 'lucro_real'], frequency: 'once' },
    { category: 'identificacao', subcategory: 'alteracoes_contrato', label: 'Alterações Contratuais', description: 'Alterações do contrato social', required: false, regimes: ['simples', 'lucro_presumido', 'lucro_real'], frequency: 'once' },
    { category: 'identificacao', subcategory: 'alvara', label: 'Alvará de Funcionamento', description: 'Alvará municipal de funcionamento', required: true, regimes: ['simples', 'lucro_presumido', 'lucro_real'], frequency: 'annual' },
    { category: 'identificacao', subcategory: 'inscricao_municipal', label: 'Inscrição Municipal', description: 'Comprovante de inscrição municipal', required: true, regimes: ['simples', 'lucro_presumido', 'lucro_real'], frequency: 'once' },
    { category: 'identificacao', subcategory: 'licenca_vigilancia', label: 'Licença Vigilância Sanitária', description: 'Licença da vigilância sanitária', required: true, regimes: ['simples', 'lucro_presumido', 'lucro_real'], frequency: 'annual' },
    { category: 'identificacao', subcategory: 'cro_pj', label: 'Registro CRO-PJ', description: 'Registro da clínica no CRO', required: true, regimes: ['simples', 'lucro_presumido', 'lucro_real'], frequency: 'once' },
    { category: 'identificacao', subcategory: 'certificado_digital', label: 'Certificado Digital (e-CNPJ)', description: 'Para emissão de NFS-e e acesso ao e-CAC', required: true, regimes: ['simples', 'lucro_presumido', 'lucro_real'], frequency: 'annual' },

    // ===== RENDIMENTOS =====
    { category: 'rendimentos', subcategory: 'livro_caixa', label: 'Livro-Caixa', description: 'Relatório do Livro-Caixa com receitas de pacientes PF', required: true, regimes: ['pf'], frequency: 'monthly' },
    { category: 'rendimentos', subcategory: 'informes_convenios', label: 'Informes de Convênios', description: 'Informes de rendimentos de clínicas/convênios', required: true, regimes: ['pf', 'simples', 'lucro_presumido', 'lucro_real'], frequency: 'annual' },
    { category: 'rendimentos', subcategory: 'rpas_emitidos', label: 'RPAs Emitidos', description: 'Recibos de Pagamento a Autônomo', required: false, regimes: ['pf'], frequency: 'monthly' },
    { category: 'rendimentos', subcategory: 'informes_aplicacoes', label: 'Informes de Aplicações', description: 'Informes de rendimentos de aplicações financeiras', required: false, regimes: ['pf', 'simples', 'lucro_presumido', 'lucro_real'], frequency: 'annual' },
    { category: 'rendimentos', subcategory: 'informes_alugueis', label: 'Rendimentos de Aluguel', description: 'Comprovantes de rendimentos de aluguéis', required: false, regimes: ['pf'], frequency: 'annual' },
    { category: 'rendimentos', subcategory: 'notas_fiscais_emitidas', label: 'Notas Fiscais Emitidas', description: 'XMLs ou relatório de NFS-e emitidas', required: true, regimes: ['simples', 'lucro_presumido', 'lucro_real'], frequency: 'monthly' },
    { category: 'rendimentos', subcategory: 'relatorios_maquininha', label: 'Relatórios de Maquininha', description: 'Extratos de vendas por cartão (crédito, débito, Pix)', required: true, regimes: ['pf', 'simples', 'lucro_presumido', 'lucro_real'], frequency: 'monthly' },

    // ===== DESPESAS =====
    { category: 'despesas', subcategory: 'aluguel_consultorio', label: 'Aluguel do Consultório', description: 'Recibos de aluguel do consultório', required: true, regimes: ['pf'], frequency: 'monthly' },
    { category: 'despesas', subcategory: 'agua_luz_internet', label: 'Água, Luz, Internet', description: 'Contas de consumo do consultório', required: true, regimes: ['pf', 'lucro_real'], frequency: 'monthly' },
    { category: 'despesas', subcategory: 'material_odontologico', label: 'Material Odontológico', description: 'Notas fiscais de materiais de consumo', required: true, regimes: ['pf', 'lucro_real'], frequency: 'monthly' },
    { category: 'despesas', subcategory: 'manutencao_equipamentos', label: 'Manutenção de Equipamentos', description: 'Notas de manutenção e reparos', required: false, regimes: ['pf', 'lucro_real'], frequency: 'monthly' },
    { category: 'despesas', subcategory: 'cursos_congressos', label: 'Cursos e Congressos', description: 'Comprovantes de cursos e especializações', required: false, regimes: ['pf'], frequency: 'annual' },
    { category: 'despesas', subcategory: 'anuidade_cro', label: 'Anuidade CRO', description: 'Comprovante de pagamento da anuidade', required: true, regimes: ['pf'], frequency: 'annual' },
    { category: 'despesas', subcategory: 'notas_compras_insumos', label: 'Notas de Compras', description: 'Notas fiscais de compras e insumos', required: true, regimes: ['simples', 'lucro_presumido', 'lucro_real'], frequency: 'monthly' },
    { category: 'despesas', subcategory: 'contratos_servicos', label: 'Contratos de Serviços', description: 'Contratos de prestação de serviços', required: true, regimes: ['lucro_presumido', 'lucro_real'], frequency: 'once' },
    { category: 'despesas', subcategory: 'seguros', label: 'Apólices de Seguro', description: 'Seguros da clínica e equipamentos', required: false, regimes: ['lucro_presumido', 'lucro_real'], frequency: 'annual' },
    { category: 'despesas', subcategory: 'despesas_medicas', label: 'Despesas Médicas', description: 'Recibos de despesas médicas (titular e dependentes)', required: false, regimes: ['pf'], frequency: 'annual' },
    { category: 'despesas', subcategory: 'despesas_educacao', label: 'Despesas com Educação', description: 'Comprovantes de despesas educacionais', required: false, regimes: ['pf'], frequency: 'annual' },
    { category: 'despesas', subcategory: 'previdencia_privada', label: 'Previdência Privada (PGBL)', description: 'Informe de previdência privada', required: false, regimes: ['pf'], frequency: 'annual' },
    { category: 'despesas', subcategory: 'doacoes_incentivadas', label: 'Doações Incentivadas', description: 'Comprovantes de doações dedutíveis', required: false, regimes: ['pf'], frequency: 'annual' },

    // ===== FOLHA DE PAGAMENTO =====
    { category: 'folha_pagamento', subcategory: 'holerites', label: 'Holerites / Recibos', description: 'Recibos de pagamento de funcionários', required: true, regimes: ['pf', 'simples', 'lucro_presumido', 'lucro_real'], frequency: 'monthly' },
    { category: 'folha_pagamento', subcategory: 'guias_fgts', label: 'Guias FGTS', description: 'Guias de recolhimento do FGTS', required: true, regimes: ['pf', 'simples', 'lucro_presumido', 'lucro_real'], frequency: 'monthly' },
    { category: 'folha_pagamento', subcategory: 'guias_gps_inss', label: 'Guias GPS/INSS', description: 'Guias de recolhimento previdenciário', required: true, regimes: ['pf', 'simples', 'lucro_presumido', 'lucro_real'], frequency: 'monthly' },
    { category: 'folha_pagamento', subcategory: 'guias_irrf', label: 'Guias IRRF Salários', description: 'Imposto retido na fonte sobre salários', required: true, regimes: ['lucro_presumido', 'lucro_real'], frequency: 'monthly' },
    { category: 'folha_pagamento', subcategory: 'recibos_prolabore', label: 'Recibos de Pró-labore', description: 'Recibos de pró-labore dos sócios', required: true, regimes: ['simples', 'lucro_presumido', 'lucro_real'], frequency: 'monthly' },
    { category: 'folha_pagamento', subcategory: 'distribuicao_lucros', label: 'Distribuição de Lucros', description: 'Comprovantes de distribuição de lucros', required: true, regimes: ['simples', 'lucro_presumido', 'lucro_real'], frequency: 'monthly' },
    { category: 'folha_pagamento', subcategory: 'rescisoes', label: 'Rescisões', description: 'Termos de rescisão contratual', required: false, regimes: ['pf', 'simples', 'lucro_presumido', 'lucro_real'], frequency: 'once' },
    { category: 'folha_pagamento', subcategory: 'contratos_trabalho', label: 'Contratos de Trabalho', description: 'Contratos de trabalho dos funcionários', required: true, regimes: ['lucro_real'], frequency: 'once' },

    // ===== IMPOSTOS PAGOS =====
    { category: 'impostos', subcategory: 'carne_leao', label: 'Carnê-Leão', description: 'DARFs do carnê-leão mensal', required: true, regimes: ['pf'], frequency: 'monthly' },
    { category: 'impostos', subcategory: 'inss_autonomo', label: 'INSS Autônomo', description: 'Guias de INSS como contribuinte individual', required: true, regimes: ['pf'], frequency: 'monthly' },
    { category: 'impostos', subcategory: 'das_simples', label: 'DAS - Simples Nacional', description: 'Guias do DAS pagas', required: true, regimes: ['simples'], frequency: 'monthly' },
    { category: 'impostos', subcategory: 'darf_irpj', label: 'DARF IRPJ', description: 'Guias de IRPJ trimestrais', required: true, regimes: ['lucro_presumido', 'lucro_real'], frequency: 'quarterly' },
    { category: 'impostos', subcategory: 'darf_csll', label: 'DARF CSLL', description: 'Guias de CSLL trimestrais', required: true, regimes: ['lucro_presumido', 'lucro_real'], frequency: 'quarterly' },
    { category: 'impostos', subcategory: 'darf_pis', label: 'DARF PIS', description: 'Guias de PIS mensais', required: true, regimes: ['lucro_presumido', 'lucro_real'], frequency: 'monthly' },
    { category: 'impostos', subcategory: 'darf_cofins', label: 'DARF COFINS', description: 'Guias de COFINS mensais', required: true, regimes: ['lucro_presumido', 'lucro_real'], frequency: 'monthly' },
    { category: 'impostos', subcategory: 'guia_iss', label: 'Guia ISS', description: 'Guias de ISS municipal', required: true, regimes: ['lucro_presumido', 'lucro_real'], frequency: 'monthly' },

    // ===== BENS E DIREITOS =====
    { category: 'bens_direitos', subcategory: 'imoveis_escritura', label: 'Imóveis - Escritura', description: 'Escrituras de imóveis', required: false, regimes: ['pf'], frequency: 'once' },
    { category: 'bens_direitos', subcategory: 'imoveis_matricula', label: 'Imóveis - Matrícula', description: 'Matrículas atualizadas dos imóveis', required: false, regimes: ['pf'], frequency: 'annual' },
    { category: 'bens_direitos', subcategory: 'veiculos_crlv', label: 'Veículos - CRLV', description: 'CRLV dos veículos', required: false, regimes: ['pf'], frequency: 'annual' },
    { category: 'bens_direitos', subcategory: 'equipamentos_nf', label: 'Equipamentos - NF', description: 'Notas fiscais de equipamentos odontológicos', required: false, regimes: ['pf', 'lucro_real'], frequency: 'once' },
    { category: 'bens_direitos', subcategory: 'investimentos_extrato', label: 'Investimentos - Extrato 31/12', description: 'Extratos de investimentos em 31/12', required: true, regimes: ['pf', 'simples', 'lucro_presumido', 'lucro_real'], frequency: 'annual' },
    { category: 'bens_direitos', subcategory: 'saldo_bancario', label: 'Saldo Bancário 31/12', description: 'Saldos em conta corrente e poupança em 31/12', required: true, regimes: ['pf', 'simples', 'lucro_presumido', 'lucro_real'], frequency: 'annual' },

    // ===== DÍVIDAS =====
    { category: 'dividas', subcategory: 'financiamento_imovel', label: 'Financiamento Imóvel', description: 'Contrato e saldo devedor de financiamento imobiliário', required: false, regimes: ['pf'], frequency: 'annual' },
    { category: 'dividas', subcategory: 'financiamento_veiculo', label: 'Financiamento Veículo', description: 'Contrato e saldo devedor de financiamento de veículo', required: false, regimes: ['pf'], frequency: 'annual' },
    { category: 'dividas', subcategory: 'financiamento_equipamentos', label: 'Financiamento Equipamentos', description: 'Contrato e saldo devedor de equipamentos', required: false, regimes: ['pf', 'lucro_presumido', 'lucro_real'], frequency: 'annual' },
    { category: 'dividas', subcategory: 'emprestimos_bancarios', label: 'Empréstimos Bancários', description: 'Contratos de empréstimos', required: false, regimes: ['pf', 'simples', 'lucro_presumido', 'lucro_real'], frequency: 'annual' },

    // ===== DEPENDENTES (PF) =====
    { category: 'dependentes', subcategory: 'cpf_dependentes', label: 'CPF dos Dependentes', description: 'CPF de todos os dependentes', required: false, regimes: ['pf'], frequency: 'once' },
    { category: 'dependentes', subcategory: 'certidao_nascimento', label: 'Certidão de Nascimento', description: 'Certidões de nascimento dos filhos', required: false, regimes: ['pf'], frequency: 'once' },
    { category: 'dependentes', subcategory: 'despesas_medicas_dep', label: 'Despesas Médicas Dependentes', description: 'Recibos de despesas médicas dos dependentes', required: false, regimes: ['pf'], frequency: 'annual' },
    { category: 'dependentes', subcategory: 'despesas_educacao_dep', label: 'Despesas Educação Dependentes', description: 'Comprovantes de despesas educacionais dos dependentes', required: false, regimes: ['pf'], frequency: 'annual' },

    // ===== ESPECÍFICOS =====
    // Simples Nacional
    { category: 'especificos', subcategory: 'faturamento_mensal', label: 'Faturamento Mensal (12 meses)', description: 'Relatório de faturamento mês a mês', required: true, regimes: ['simples'], frequency: 'monthly' },
    { category: 'especificos', subcategory: 'fator_r_calculo', label: 'Cálculo Fator R', description: 'Demonstrativo do Fator R (Folha/Faturamento)', required: true, regimes: ['simples'], frequency: 'monthly' },
    { category: 'especificos', subcategory: 'defis', label: 'DEFIS', description: 'Declaração de Informações Socioeconômicas e Fiscais', required: true, regimes: ['simples'], frequency: 'annual' },

    // Lucro Presumido
    { category: 'especificos', subcategory: 'balancete_trimestral', label: 'Balancete Trimestral', description: 'Balancete contábil trimestral', required: true, regimes: ['lucro_presumido'], frequency: 'quarterly' },
    { category: 'especificos', subcategory: 'retencoes_fonte_pcc', label: 'Retenções na Fonte (PCC)', description: 'Comprovantes de PIS/COFINS/CSLL retidos', required: true, regimes: ['lucro_presumido', 'lucro_real'], frequency: 'monthly' },
    { category: 'especificos', subcategory: 'retencoes_fonte_irrf', label: 'Retenções na Fonte (IRRF)', description: 'Comprovantes de IRRF retido por convênios', required: true, regimes: ['lucro_presumido', 'lucro_real'], frequency: 'monthly' },
    { category: 'especificos', subcategory: 'dre', label: 'DRE', description: 'Demonstração do Resultado do Exercício', required: true, regimes: ['lucro_presumido', 'lucro_real'], frequency: 'annual' },

    // Lucro Real
    { category: 'especificos', subcategory: 'livro_diario', label: 'Livro Diário', description: 'Livro Diário da escrituração contábil', required: true, regimes: ['lucro_real'], frequency: 'annual' },
    { category: 'especificos', subcategory: 'livro_razao', label: 'Livro Razão', description: 'Livro Razão da escrituração contábil', required: true, regimes: ['lucro_real'], frequency: 'annual' },
    { category: 'especificos', subcategory: 'lalur', label: 'LALUR', description: 'Livro de Apuração do Lucro Real', required: true, regimes: ['lucro_real'], frequency: 'annual' },
    { category: 'especificos', subcategory: 'lacs', label: 'LACS', description: 'Livro de Apuração da CSLL', required: true, regimes: ['lucro_real'], frequency: 'annual' },
    { category: 'especificos', subcategory: 'balanco_patrimonial', label: 'Balanço Patrimonial', description: 'Balanço Patrimonial anual', required: true, regimes: ['lucro_presumido', 'lucro_real'], frequency: 'annual' },
    { category: 'especificos', subcategory: 'controle_estoque', label: 'Controle de Estoque', description: 'Controle de estoque de materiais', required: true, regimes: ['lucro_real'], frequency: 'monthly' },
    { category: 'especificos', subcategory: 'inventario', label: 'Inventário 31/12', description: 'Inventário físico em 31/12', required: true, regimes: ['lucro_real'], frequency: 'annual' },
    { category: 'especificos', subcategory: 'depreciacao_ativos', label: 'Depreciação de Ativos', description: 'Laudos de depreciação de equipamentos', required: true, regimes: ['lucro_real'], frequency: 'annual' },
    { category: 'especificos', subcategory: 'creditos_pis_cofins', label: 'Créditos PIS/COFINS', description: 'Notas para apropriação de créditos (regime não-cumulativo)', required: true, regimes: ['lucro_real'], frequency: 'monthly' },
];

// Helper to filter checklist by regime
export function getChecklistByRegime(regime: TaxRegime): FiscalChecklistItem[] {
    if (regime === 'all') return FISCAL_DOCUMENTS_CHECKLIST;
    return FISCAL_DOCUMENTS_CHECKLIST.filter(item =>
        item.regimes.includes(regime) || item.regimes.includes('all')
    );
}

// Helper to group checklist by category
export function groupChecklistByCategory(items: FiscalChecklistItem[]): FiscalChecklistSection[] {
    const categories = [...new Set(items.map(i => i.category))];

    return categories.map(category => ({
        category,
        label: FISCAL_CATEGORY_LABELS[category],
        icon: getCategoryIcon(category),
        items: items.filter(i => i.category === category),
        completedCount: 0,
        totalCount: items.filter(i => i.category === category).length,
    }));
}

// Helper to get category icon name
function getCategoryIcon(category: FiscalDocumentCategory): string {
    const icons: Record<FiscalDocumentCategory, string> = {
        identificacao: 'id-card',
        rendimentos: 'trending-up',
        despesas: 'receipt',
        folha_pagamento: 'users',
        impostos: 'file-text',
        bens_direitos: 'home',
        dividas: 'credit-card',
        dependentes: 'user-plus',
        especificos: 'folder',
    };
    return icons[category];
}
