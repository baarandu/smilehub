import jsPDF from 'jspdf';
import type { IRSummary } from '@/types/incomeTax';

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (date: Date) => {
  return date.toLocaleDateString('pt-BR');
};

/**
 * Generate the annual IR Report PDF (Dossie IR)
 */
export async function generateIRPdf(summary: IRSummary): Promise<void> {
  const doc = new jsPDF();
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
  doc.text('Receita Pessoa Fisica:', col1, y);
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
  }

  doc.setTextColor(0, 0, 0);

  // Save the PDF
  const filename = `dossie-ir-${summary.year}.pdf`;
  doc.save(filename);
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
