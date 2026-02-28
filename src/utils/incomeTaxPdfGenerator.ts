import jsPDF from 'jspdf';
import type { IRSummary } from '@/types/incomeTax';
import { computePdfHash, generateDocumentId } from '@/utils/pdfHash';
import { formatDecimal as formatCurrency } from '@/utils/formatters';

export interface IRPdfResult {
  hash: string;
  documentId: string;
}

const formatDate = (date: Date) => {
  return date.toLocaleDateString('pt-BR');
};

// Carnê-Leão tax table for 2024/2025 (monthly)
const CARNE_LEAO_TABLE = [
  { limit: 2259.20, rate: 0, deduction: 0 },
  { limit: 2826.65, rate: 0.075, deduction: 169.44 },
  { limit: 3751.05, rate: 0.15, deduction: 381.44 },
  { limit: 4664.68, rate: 0.225, deduction: 662.77 },
  { limit: Infinity, rate: 0.275, deduction: 896.00 },
];

const calculateCarneLeao = (baseCalculo: number): { aliquota: number; imposto: number } => {
  for (const faixa of CARNE_LEAO_TABLE) {
    if (baseCalculo <= faixa.limit) {
      const imposto = Math.max(0, baseCalculo * faixa.rate - faixa.deduction);
      return { aliquota: faixa.rate * 100, imposto };
    }
  }
  return { aliquota: 27.5, imposto: baseCalculo * 0.275 - 896.00 };
};

/**
 * Generate the annual IR Report PDF (Dossie IR)
 */
export async function generateIRPdf(summary: IRSummary): Promise<IRPdfResult> {
  const doc = new jsPDF();
  const documentId = generateDocumentId();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  // ============ PAGE 1: Cover and Summary ============
  let y = 30;

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('DOSSIE IMPOSTO DE RENDA', pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(`Ano-Calendario: ${summary.year}`, pageWidth / 2, y, { align: 'center' });
  y += 20;

  // Fiscal Profile Info
  if (summary.fiscal_profile) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('IDENTIFICACAO DO CONTRIBUINTE', margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    if (summary.fiscal_profile.pf_enabled) {
      doc.text(`CPF: ${summary.fiscal_profile.pf_cpf || 'Nao informado'}`, margin, y);
      y += 6;
      doc.text(`CRO: ${summary.fiscal_profile.pf_cro || 'Nao informado'}`, margin, y);
      y += 6;
      if (summary.fiscal_profile.pf_address) {
        doc.text(`Endereco: ${summary.fiscal_profile.pf_address}`, margin, y);
        y += 6;
      }
      if (summary.fiscal_profile.pf_city || summary.fiscal_profile.pf_state) {
        doc.text(
          `${summary.fiscal_profile.pf_city || ''} - ${summary.fiscal_profile.pf_state || ''}`,
          margin,
          y
        );
        y += 6;
      }
      if (summary.fiscal_profile.pf_uses_carne_leao) {
        doc.text('Utiliza Carnê-Leao: Sim', margin, y);
        y += 6;
      }
    }

    if (summary.fiscal_profile.pj_enabled) {
      y += 4;
      doc.text(`CNPJ: ${summary.fiscal_profile.pj_cnpj || 'Nao informado'}`, margin, y);
      y += 6;
      doc.text(`Razao Social: ${summary.fiscal_profile.pj_razao_social || 'Nao informado'}`, margin, y);
      y += 6;
      if (summary.fiscal_profile.pj_regime_tributario) {
        const regimes: Record<string, string> = {
          simples: 'Simples Nacional',
          lucro_presumido: 'Lucro Presumido',
          lucro_real: 'Lucro Real',
        };
        doc.text(`Regime: ${regimes[summary.fiscal_profile.pj_regime_tributario] || summary.fiscal_profile.pj_regime_tributario}`, margin, y);
        y += 6;
      }
    }
  }

  y += 15;

  // Summary Box
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 80, 3, 3, 'FD');

  y += 15;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMO ANUAL', pageWidth / 2, y, { align: 'center' });
  y += 15;

  doc.setFontSize(11);
  const col1 = margin + 10;
  const col2 = pageWidth / 2 + 10;

  doc.setFont('helvetica', 'bold');
  doc.text('Receita Pessoa Física:', col1, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`R$ ${formatCurrency(summary.total_income_pf)}`, col1 + 60, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Receita Pessoa Juridica:', col2, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`R$ ${formatCurrency(summary.total_income_pj)}`, col2 + 60, y);
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.text('IRRF Retido:', col1, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`R$ ${formatCurrency(summary.total_irrf)}`, col1 + 60, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Despesas Dedutiveis:', col2, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`R$ ${formatCurrency(summary.total_expenses_deductible)}`, col2 + 60, y);
  y += 15;

  doc.setFont('helvetica', 'bold');
  doc.text('RECEITA TOTAL:', col1, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`R$ ${formatCurrency(summary.total_income)}`, col1 + 60, y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 128, 0);
  doc.text('RESULTADO LIQUIDO:', col2, y);
  doc.text(`R$ ${formatCurrency(summary.net_result)}`, col2 + 60, y);
  doc.setTextColor(0, 0, 0);

  // ============ PAGE 2: Monthly Breakdown ============
  doc.addPage();
  y = 30;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RECEITAS POR MES', pageWidth / 2, y, { align: 'center' });
  y += 15;

  // Table Header
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y - 4, pageWidth - 2 * margin, 8, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Mes', margin + 2, y);
  doc.text('Receita PF', margin + 40, y);
  doc.text('Receita PJ', margin + 70, y);
  doc.text('Total', margin + 100, y);
  doc.text('IRRF', margin + 130, y);
  doc.text('Deducoes', pageWidth - margin - 20, y);
  y += 8;

  // Table Rows
  doc.setFont('helvetica', 'normal');
  for (const month of summary.monthly) {
    if (y > 270) {
      doc.addPage();
      y = 30;
    }

    doc.text(month.month_name, margin + 2, y);
    doc.text(`R$ ${formatCurrency(month.income_pf)}`, margin + 40, y);
    doc.text(`R$ ${formatCurrency(month.income_pj)}`, margin + 70, y);
    doc.text(`R$ ${formatCurrency(month.income_total)}`, margin + 100, y);
    doc.text(`R$ ${formatCurrency(month.irrf_total)}`, margin + 130, y);
    doc.text(`R$ ${formatCurrency(month.expenses_deductible)}`, pageWidth - margin - 20, y);
    y += 7;
  }

  // Totals Row
  y += 3;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y - 3, pageWidth - margin, y - 3);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', margin + 2, y);
  doc.text(`R$ ${formatCurrency(summary.total_income_pf)}`, margin + 40, y);
  doc.text(`R$ ${formatCurrency(summary.total_income_pj)}`, margin + 70, y);
  doc.text(`R$ ${formatCurrency(summary.total_income)}`, margin + 100, y);
  doc.text(`R$ ${formatCurrency(summary.total_irrf)}`, margin + 130, y);
  doc.text(`R$ ${formatCurrency(summary.total_expenses_deductible)}`, pageWidth - margin - 20, y);

  // ============ PAGE 3: Deductible Expenses ============
  doc.addPage();
  y = 30;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('DESPESAS DEDUTIVEIS (LIVRO CAIXA)', pageWidth / 2, y, { align: 'center' });
  y += 15;

  if (summary.expenses_by_category.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.text('Nenhuma despesa dedutivel registrada no periodo.', margin, y);
  } else {
    // Table Header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 4, pageWidth - 2 * margin, 8, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Categoria', margin + 2, y);
    doc.text('Qtd.', margin + 80, y);
    doc.text('Valor Total', pageWidth - margin - 30, y);
    y += 8;

    // Table Rows
    doc.setFont('helvetica', 'normal');
    for (const cat of summary.expenses_by_category) {
      doc.text(cat.category, margin + 2, y);
      doc.text(cat.transaction_count.toString(), margin + 80, y);
      doc.text(`R$ ${formatCurrency(cat.total_amount)}`, pageWidth - margin - 2, y, { align: 'right' });
      y += 7;
    }

    // Total
    y += 3;
    doc.line(margin, y - 3, pageWidth - margin, y - 3);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL DEDUTIVEL', margin + 2, y);
    doc.text(
      summary.expenses_by_category.reduce((sum, c) => sum + c.transaction_count, 0).toString(),
      margin + 80,
      y
    );
    doc.text(`R$ ${formatCurrency(summary.total_expenses_deductible)}`, pageWidth - margin - 2, y, {
      align: 'right',
    });
  }

  // ============ PAGE 4: PF Payers ============
  doc.addPage();
  y = 30;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RELACAO DE PAGADORES PESSOA FISICA', pageWidth / 2, y, { align: 'center' });
  y += 15;

  if (summary.payers_pf.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.text('Nenhum pagador PF registrado no periodo.', margin, y);
  } else {
    // Table Header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 4, pageWidth - 2 * margin, 8, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('CPF', margin + 2, y);
    doc.text('Nome', margin + 40, y);
    doc.text('Valor Total', pageWidth - margin - 25, y);
    y += 8;

    // Table Rows
    doc.setFont('helvetica', 'normal');
    for (const payer of summary.payers_pf) {
      if (y > 270) {
        doc.addPage();
        y = 30;
      }

      doc.text(payer.cpf, margin + 2, y);

      // Truncate name if too long
      let displayName = payer.name;
      const maxNameWidth = 90;
      if (doc.getTextWidth(displayName) > maxNameWidth) {
        while (doc.getTextWidth(displayName + '...') > maxNameWidth && displayName.length > 0) {
          displayName = displayName.slice(0, -1);
        }
        displayName += '...';
      }
      doc.text(displayName, margin + 40, y);
      doc.text(`R$ ${formatCurrency(payer.total_amount)}`, pageWidth - margin - 2, y, { align: 'right' });
      y += 7;
    }
  }

  // ============ PAGE 5: PJ Sources ============
  doc.addPage();
  y = 30;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RELACAO DE FONTES PAGADORAS PESSOA JURIDICA', pageWidth / 2, y, { align: 'center' });
  y += 15;

  if (summary.payers_pj.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.text('Nenhuma fonte PJ registrada no periodo.', margin, y);
  } else {
    // Table Header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 4, pageWidth - 2 * margin, 8, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('CNPJ', margin + 2, y);
    doc.text('Razao Social', margin + 45, y);
    doc.text('Valor', margin + 115, y);
    doc.text('IRRF', pageWidth - margin - 20, y);
    y += 8;

    // Table Rows
    doc.setFont('helvetica', 'normal');
    for (const source of summary.payers_pj) {
      if (y > 270) {
        doc.addPage();
        y = 30;
      }

      doc.text(source.cnpj, margin + 2, y);

      // Truncate name if too long
      const name = source.nome_fantasia || source.razao_social;
      let displayName = name;
      const maxNameWidth = 60;
      if (doc.getTextWidth(displayName) > maxNameWidth) {
        while (doc.getTextWidth(displayName + '...') > maxNameWidth && displayName.length > 0) {
          displayName = displayName.slice(0, -1);
        }
        displayName += '...';
      }
      doc.text(displayName, margin + 45, y);
      doc.text(`R$ ${formatCurrency(source.total_amount)}`, margin + 115, y);
      doc.text(`R$ ${formatCurrency(source.irrf_total)}`, pageWidth - margin - 2, y, { align: 'right' });
      y += 7;
    }
  }

  // ============ PAGE 6: Carnê-Leão (if PF uses it) ============
  if (summary.fiscal_profile?.pf_enabled && summary.fiscal_profile?.pf_uses_carne_leao) {
    doc.addPage();
    y = 30;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('DEMONSTRATIVO CARNE-LEAO MENSAL', pageWidth / 2, y, { align: 'center' });
    y += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Simulacao baseada na tabela progressiva mensal vigente', pageWidth / 2, y, { align: 'center' });
    y += 12;

    // Table Header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 4, pageWidth - 2 * margin, 8, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Mes', margin + 2, y);
    doc.text('Receita PF', margin + 30, y);
    doc.text('(-) Deducoes', margin + 58, y);
    doc.text('Base Calculo', margin + 88, y);
    doc.text('Aliq.', margin + 118, y);
    doc.text('IR Devido', margin + 135, y);
    doc.text('(-) IRRF', margin + 158, y);
    y += 8;

    // Table Rows with Carnê-Leão calculation
    doc.setFont('helvetica', 'normal');
    let totalIRDevido = 0;
    let totalIRRFRetido = 0;

    for (const month of summary.monthly) {
      if (y > 270) {
        doc.addPage();
        y = 30;
      }

      const baseCalculo = Math.max(0, month.income_pf - month.expenses_deductible);
      const { aliquota, imposto } = calculateCarneLeao(baseCalculo);
      const irrfMes = month.irrf_total; // IRRF retido no mês
      totalIRDevido += imposto;
      totalIRRFRetido += irrfMes;

      doc.text(month.month_name.substring(0, 3), margin + 2, y);
      doc.text(`R$ ${formatCurrency(month.income_pf)}`, margin + 25, y);
      doc.text(`R$ ${formatCurrency(month.expenses_deductible)}`, margin + 55, y);
      doc.text(`R$ ${formatCurrency(baseCalculo)}`, margin + 85, y);
      doc.text(`${aliquota.toFixed(1)}%`, margin + 118, y);
      doc.text(`R$ ${formatCurrency(imposto)}`, margin + 133, y);
      doc.text(`R$ ${formatCurrency(irrfMes)}`, margin + 158, y);
      y += 6;
    }

    // Totals
    y += 3;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y - 3, pageWidth - margin, y - 3);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', margin + 2, y);
    doc.text(`R$ ${formatCurrency(summary.total_income_pf)}`, margin + 25, y);
    doc.text(`R$ ${formatCurrency(summary.total_expenses_deductible)}`, margin + 55, y);
    doc.text(`R$ ${formatCurrency(Math.max(0, summary.total_income_pf - summary.total_expenses_deductible))}`, margin + 85, y);
    doc.text(`R$ ${formatCurrency(totalIRDevido)}`, margin + 133, y);
    doc.text(`R$ ${formatCurrency(totalIRRFRetido)}`, margin + 158, y);

    y += 15;

    // Summary box
    doc.setFillColor(255, 250, 240);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 35, 3, 3, 'FD');
    y += 10;

    doc.setFontSize(10);
    const saldoIR = totalIRDevido - totalIRRFRetido;
    doc.text('Resumo Carne-Leao:', margin + 5, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.text(`Total IR Devido no ano: R$ ${formatCurrency(totalIRDevido)}`, margin + 5, y);
    doc.text(`Total IRRF Retido: R$ ${formatCurrency(totalIRRFRetido)}`, margin + 85, y);
    y += 8;
    doc.setFont('helvetica', 'bold');
    if (saldoIR > 0) {
      doc.setTextColor(200, 0, 0);
      doc.text(`Saldo a Pagar: R$ ${formatCurrency(saldoIR)}`, margin + 5, y);
    } else {
      doc.setTextColor(0, 128, 0);
      doc.text(`Saldo a Restituir: R$ ${formatCurrency(Math.abs(saldoIR))}`, margin + 5, y);
    }
    doc.setTextColor(0, 0, 0);
  }

  // ============ PAGE 7: DMED - Relação para Declaração ============
  if (summary.payers_pf.length > 0) {
    doc.addPage();
    y = 30;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('DMED - DECLARACAO DE SERVICOS MEDICOS', pageWidth / 2, y, { align: 'center' });
    y += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Relacao de pacientes para a Declaracao de Servicos Medicos e Receita Saude', pageWidth / 2, y, { align: 'center' });
    y += 15;

    // Info box
    doc.setFillColor(240, 248, 255);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 25, 3, 3, 'FD');
    y += 8;
    doc.setFontSize(8);
    doc.text('A DMED e obrigatoria para PJ prestadoras de servicos de saude. O prazo de entrega', margin + 5, y);
    y += 5;
    doc.text('geralmente e ate o ultimo dia util de marco do ano seguinte ao ano-calendario.', margin + 5, y);
    y += 5;
    doc.text('Os dados abaixo devem ser conferidos com seu contador antes do envio.', margin + 5, y);
    y += 12;

    // Table Header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 4, pageWidth - 2 * margin, 8, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('#', margin + 2, y);
    doc.text('CPF Responsavel', margin + 12, y);
    doc.text('Nome do Paciente', margin + 55, y);
    doc.text('Qtd.', margin + 125, y);
    doc.text('Valor Total', pageWidth - margin - 25, y);
    y += 8;

    // Table Rows - sorted by amount
    doc.setFont('helvetica', 'normal');
    const sortedPayers = [...summary.payers_pf].sort((a, b) => b.total_amount - a.total_amount);
    let count = 0;

    for (const payer of sortedPayers) {
      if (y > 270) {
        doc.addPage();
        y = 30;
      }

      count++;
      doc.text(count.toString(), margin + 2, y);
      doc.text(payer.cpf || 'Nao informado', margin + 12, y);

      // Truncate name
      let displayName = payer.name;
      const maxNameWidth = 65;
      if (doc.getTextWidth(displayName) > maxNameWidth) {
        while (doc.getTextWidth(displayName + '...') > maxNameWidth && displayName.length > 0) {
          displayName = displayName.slice(0, -1);
        }
        displayName += '...';
      }
      doc.text(displayName, margin + 55, y);
      doc.text(payer.transaction_count?.toString() || '1', margin + 128, y);
      doc.text(`R$ ${formatCurrency(payer.total_amount)}`, pageWidth - margin - 2, y, { align: 'right' });
      y += 6;
    }

    // Total
    y += 3;
    doc.line(margin, y - 3, pageWidth - margin, y - 3);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', margin + 2, y);
    doc.text(`${sortedPayers.length} pacientes`, margin + 55, y);
    doc.text(`R$ ${formatCurrency(summary.total_income_pf)}`, pageWidth - margin - 2, y, { align: 'right' });
  }

  // ============ PAGE 8: Checklist de Documentos ============
  doc.addPage();
  y = 30;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('CHECKLIST DE DOCUMENTOS PARA O CONTADOR', pageWidth / 2, y, { align: 'center' });
  y += 15;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  // Determine which checklist based on fiscal profile
  const isPF = summary.fiscal_profile?.pf_enabled;
  const isPJ = summary.fiscal_profile?.pj_enabled;
  const regime = summary.fiscal_profile?.pj_regime_tributario;

  // PF Checklist
  if (isPF) {
    doc.setFont('helvetica', 'bold');
    doc.text('PESSOA FÍSICA (Autonomo):', margin, y);
    y += 8;
    doc.setFont('helvetica', 'normal');

    const pfChecklist = [
      '[ ] CPF e RG',
      '[ ] Comprovante de endereco atualizado',
      '[ ] Dados bancarios (para restituicao)',
      '[ ] Livro-Caixa mensal completo',
      '[ ] Informes de rendimentos de convenios/clinicas',
      '[ ] Recibos de aluguel do consultorio',
      '[ ] Notas de materiais odontologicos',
      '[ ] Comprovante de anuidade CRO',
      '[ ] Guias de INSS pagas (se autonomo)',
      '[ ] Comprovantes de despesas medicas pessoais',
      '[ ] Informe de previdencia privada (PGBL)',
      '[ ] Extratos de investimentos em 31/12',
      '[ ] Documentos de imoveis e veiculos',
    ];

    for (const item of pfChecklist) {
      doc.text(item, margin + 5, y);
      y += 6;
    }
    y += 5;
  }

  // PJ Checklist
  if (isPJ) {
    doc.setFont('helvetica', 'bold');
    doc.text(`PESSOA JURÍDICA (${regime === 'simples' ? 'Simples Nacional' : regime === 'lucro_presumido' ? 'Lucro Presumido' : 'Lucro Real'}):`, margin, y);
    y += 8;
    doc.setFont('helvetica', 'normal');

    const pjBaseChecklist = [
      '[ ] CNPJ e Contrato Social',
      '[ ] Alvara de funcionamento',
      '[ ] Certificado Digital (e-CNPJ)',
      '[ ] Notas fiscais emitidas (12 meses)',
      '[ ] Extratos bancarios da conta PJ',
      '[ ] Folha de pagamento (12 meses)',
      '[ ] Recibos de pro-labore',
      '[ ] Comprovantes de distribuicao de lucros',
      '[ ] Relatorios de maquininha de cartao',
    ];

    for (const item of pjBaseChecklist) {
      doc.text(item, margin + 5, y);
      y += 6;
    }

    // Regime-specific items
    if (regime === 'simples') {
      y += 3;
      doc.setFont('helvetica', 'bold');
      doc.text('Especifico Simples Nacional:', margin + 5, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.text('[ ] Guias DAS pagas (12 meses)', margin + 10, y);
      y += 6;
      doc.text('[ ] Calculo do Fator R', margin + 10, y);
      y += 6;
      doc.text('[ ] DEFIS do ano anterior', margin + 10, y);
    } else if (regime === 'lucro_presumido') {
      y += 3;
      doc.setFont('helvetica', 'bold');
      doc.text('Especifico Lucro Presumido:', margin + 5, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.text('[ ] DARFs IRPJ/CSLL (trimestrais)', margin + 10, y);
      y += 6;
      doc.text('[ ] Balancete trimestral', margin + 10, y);
      y += 6;
      doc.text('[ ] DRE anual', margin + 10, y);
      y += 6;
      doc.text('[ ] Balanco Patrimonial', margin + 10, y);
    } else if (regime === 'lucro_real') {
      y += 3;
      doc.setFont('helvetica', 'bold');
      doc.text('Especifico Lucro Real:', margin + 5, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.text('[ ] Livro Diario e Razao', margin + 10, y);
      y += 6;
      doc.text('[ ] LALUR/LACS', margin + 10, y);
      y += 6;
      doc.text('[ ] Controle de estoque', margin + 10, y);
      y += 6;
      doc.text('[ ] Inventario em 31/12', margin + 10, y);
      y += 6;
      doc.text('[ ] Laudos de depreciacao', margin + 10, y);
    }
  }

  // ============ DISCLAIMER PAGE ============
  doc.addPage();
  y = 30;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('AVISO IMPORTANTE', pageWidth / 2, y, { align: 'center' });
  y += 20;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const disclaimerText = [
    'Este relatorio e um documento INFORMATIVO gerado automaticamente para fins de',
    'organizacao e planejamento tributario. NAO substitui a assessoria de um contador',
    'ou profissional qualificado.',
    '',
    'IMPORTANTE:',
    '',
    '1. Os valores apresentados sao estimativas baseadas nos dados registrados no sistema',
    '   e nas aliquotas vigentes na data de geracao do relatorio.',
    '',
    '2. As aliquotas e faixas de impostos podem sofrer alteracoes pela legislacao.',
    '   Sempre consulte a legislacao atualizada e/ou um profissional contabil.',
    '',
    '3. Para fins de declaracao oficial de Imposto de Renda junto a Receita Federal,',
    '   os dados devem ser conferidos e validados por um contador.',
    '',
    '4. O regime tributario mais vantajoso depende de diversos fatores especificos',
    '   de cada contribuinte. Recomendamos consultar seu contador antes de tomar',
    '   decisoes sobre enquadramento tributario.',
    '',
    '5. Este sistema nao oferece consultoria tributaria. As informacoes sao fornecidas',
    '   apenas como ferramenta de apoio a gestao financeira.',
    '',
    '',
    'Ao utilizar este relatorio, voce concorda que compreendeu estas limitacoes.',
  ];

  for (const line of disclaimerText) {
    doc.text(line, margin, y);
    y += 6;
  }

  y += 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text(`Relatorio gerado em ${formatDate(new Date())}`, margin, y);

  // ============ Footer on all pages ============
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(128, 128, 128);

    // Footer text
    doc.text(
      `Documento informativo - Consulte um contador para fins oficiais`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );

    // Page number
    doc.text(`Pagina ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });

    // Document ID on first page only
    if (i === 1) {
      doc.setFontSize(7);
      doc.setTextColor(180, 180, 180);
      doc.text(`ID: ${documentId} | Emitido em: ${new Date().toLocaleString('pt-BR')}`, margin, pageHeight - 5);
    }
  }

  doc.setTextColor(0, 0, 0);

  // Save the PDF and compute hash
  const arrayBuffer = doc.output('arraybuffer');
  const hash = await computePdfHash(arrayBuffer);
  const filename = `dossie-ir-${summary.year}.pdf`;
  doc.save(filename);
  return { hash, documentId };
}

/**
 * Generate PDF and return blob URL for preview
 */
export async function generateIRPdfPreview(summary: IRSummary): Promise<string> {
  const doc = new jsPDF();
  // For preview, we'd build the same document but return blob
  // For simplicity, we'll just generate and return the blob URL
  // The full implementation would mirror generateIRPdf but return blob

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 30;

  // Simple preview with summary only
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`Dossie IR - ${summary.year}`, pageWidth / 2, y, { align: 'center' });
  y += 20;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Receita Total: R$ ${formatCurrency(summary.total_income)}`, margin, y);
  y += 10;
  doc.text(`Despesas Dedutiveis: R$ ${formatCurrency(summary.total_expenses_deductible)}`, margin, y);
  y += 10;
  doc.text(`Resultado Liquido: R$ ${formatCurrency(summary.net_result)}`, margin, y);

  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
}
