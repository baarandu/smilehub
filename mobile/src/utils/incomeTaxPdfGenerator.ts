import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import * as XLSX from 'xlsx';
import type { IRSummary } from '../types/incomeTax';

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (date: Date) => {
  return date.toLocaleDateString('pt-BR');
};

/**
 * Generate HTML content for the IR Report PDF
 */
function generateHtmlContent(summary: IRSummary): string {
  const styles = `
    <style>
      body {
        font-family: 'Helvetica', sans-serif;
        font-size: 12px;
        padding: 20px;
        color: #333;
      }
      .header {
        text-align: center;
        margin-bottom: 30px;
      }
      .header h1 {
        font-size: 22px;
        margin-bottom: 5px;
        color: #b94a48;
      }
      .header h2 {
        font-size: 14px;
        font-weight: normal;
        color: #666;
      }
      .section {
        margin-bottom: 25px;
        page-break-inside: avoid;
      }
      .section-title {
        font-size: 14px;
        font-weight: bold;
        background: #f0f0f0;
        padding: 8px 12px;
        margin-bottom: 10px;
        border-left: 4px solid #b94a48;
      }
      .summary-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 20px;
      }
      .summary-item {
        flex: 1;
        min-width: 120px;
        background: #f9f9f9;
        padding: 12px;
        border-radius: 6px;
        text-align: center;
      }
      .summary-item .label {
        font-size: 10px;
        color: #666;
        margin-bottom: 4px;
      }
      .summary-item .value {
        font-size: 14px;
        font-weight: bold;
      }
      .summary-item.highlight {
        background: #d1fae5;
        border: 1px solid #10b981;
      }
      .summary-item.highlight .value {
        color: #047857;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 10px;
      }
      th {
        background: #f0f0f0;
        padding: 8px;
        text-align: left;
        font-weight: bold;
        border-bottom: 2px solid #ddd;
      }
      th.right, td.right {
        text-align: right;
      }
      td {
        padding: 6px 8px;
        border-bottom: 1px solid #eee;
      }
      tr:last-child td {
        border-bottom: none;
      }
      .total-row {
        font-weight: bold;
        background: #f9f9f9;
      }
      .total-row td {
        border-top: 2px solid #ddd;
      }
      .footer {
        margin-top: 30px;
        padding-top: 15px;
        border-top: 1px solid #ddd;
        text-align: center;
        font-size: 9px;
        color: #999;
      }
      .page-break {
        page-break-before: always;
      }
      .fiscal-info {
        background: #f9f9f9;
        padding: 15px;
        border-radius: 6px;
        margin-bottom: 20px;
      }
      .fiscal-info p {
        margin: 4px 0;
      }
      .text-teal { color: #b94a48; }
      .text-blue { color: #2563EB; }
      .text-amber { color: #D97706; }
      .text-red { color: #DC2626; }
    </style>
  `;

  // Fiscal Profile Section
  let fiscalProfileHtml = '';
  if (summary.fiscal_profile) {
    fiscalProfileHtml = `
      <div class="fiscal-info">
        <strong>IDENTIFICACAO DO CONTRIBUINTE</strong>
        ${summary.fiscal_profile.pf_enabled ? `
          <p>CPF: ${summary.fiscal_profile.pf_cpf || 'Nao informado'}</p>
          <p>CRO: ${summary.fiscal_profile.pf_cro || 'Nao informado'}</p>
          ${summary.fiscal_profile.pf_address ? `<p>Endereço: ${summary.fiscal_profile.pf_address}</p>` : ''}
          ${summary.fiscal_profile.pf_city || summary.fiscal_profile.pf_state ?
          `<p>${summary.fiscal_profile.pf_city || ''} - ${summary.fiscal_profile.pf_state || ''}</p>` : ''}
        ` : ''}
        ${summary.fiscal_profile.pj_enabled ? `
          <p>CNPJ: ${summary.fiscal_profile.pj_cnpj || 'Nao informado'}</p>
          <p>Razao Social: ${summary.fiscal_profile.pj_razao_social || 'Nao informado'}</p>
          ${summary.fiscal_profile.pj_regime_tributario ? `
            <p>Regime: ${summary.fiscal_profile.pj_regime_tributario === 'simples' ? 'Simples Nacional' :
            summary.fiscal_profile.pj_regime_tributario === 'lucro_presumido' ? 'Lucro Presumido' :
              summary.fiscal_profile.pj_regime_tributario === 'lucro_real' ? 'Lucro Real' :
                summary.fiscal_profile.pj_regime_tributario
          }</p>
          ` : ''}
        ` : ''}
      </div>
    `;
  }

  // Monthly Table
  const monthlyRows = summary.monthly.map(month => `
    <tr>
      <td>${month.month_name}</td>
      <td class="right">R$ ${formatCurrency(month.income_pf)}</td>
      <td class="right">R$ ${formatCurrency(month.income_pj)}</td>
      <td class="right"><strong>R$ ${formatCurrency(month.income_total)}</strong></td>
      <td class="right text-amber">R$ ${formatCurrency(month.irrf_total)}</td>
      <td class="right text-red">R$ ${formatCurrency(month.expenses_deductible)}</td>
    </tr>
  `).join('');

  // PF Payers Table
  const pfPayersRows = summary.payers_pf.map(payer => `
    <tr>
      <td>${payer.cpf}</td>
      <td>${payer.name}</td>
      <td class="right">${payer.transaction_count}</td>
      <td class="right"><strong>R$ ${formatCurrency(payer.total_amount)}</strong></td>
    </tr>
  `).join('');

  // PJ Sources Table
  const pjSourcesRows = summary.payers_pj.map(source => `
    <tr>
      <td>${source.cnpj}</td>
      <td>${source.nome_fantasia || source.razao_social}</td>
      <td class="right">${source.transaction_count}</td>
      <td class="right"><strong>R$ ${formatCurrency(source.total_amount)}</strong></td>
      <td class="right text-amber">R$ ${formatCurrency(source.irrf_total)}</td>
    </tr>
  `).join('');

  // Expenses Table
  const expensesRows = summary.expenses_by_category.map(cat => `
    <tr>
      <td>${cat.category}</td>
      <td class="right">${cat.transaction_count}</td>
      <td class="right text-red"><strong>R$ ${formatCurrency(cat.total_amount)}</strong></td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${styles}
    </head>
    <body>
      <!-- PAGE 1: Cover and Summary -->
      <div class="header">
        <h1>DOSSIE IMPOSTO DE RENDA</h1>
        <h2>Ano-Calendario: ${summary.year}</h2>
      </div>

      ${fiscalProfileHtml}

      <div class="section">
        <div class="section-title">RESUMO ANUAL</div>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="label">Receita PF</div>
            <div class="value text-teal">R$ ${formatCurrency(summary.total_income_pf)}</div>
          </div>
          <div class="summary-item">
            <div class="label">Receita PJ</div>
            <div class="value text-blue">R$ ${formatCurrency(summary.total_income_pj)}</div>
          </div>
          <div class="summary-item">
            <div class="label">Receita Total</div>
            <div class="value">R$ ${formatCurrency(summary.total_income)}</div>
          </div>
          <div class="summary-item">
            <div class="label">IRRF Retido</div>
            <div class="value text-amber">R$ ${formatCurrency(summary.total_irrf)}</div>
          </div>
          <div class="summary-item">
            <div class="label">Deducoes</div>
            <div class="value text-red">R$ ${formatCurrency(summary.total_expenses_deductible)}</div>
          </div>
          <div class="summary-item highlight">
            <div class="label">Resultado Liquido</div>
            <div class="value">R$ ${formatCurrency(summary.net_result)}</div>
          </div>
        </div>
      </div>

      <!-- PAGE 2: Monthly Breakdown -->
      <div class="section page-break">
        <div class="section-title">RECEITAS POR MES</div>
        <table>
          <thead>
            <tr>
              <th>Mes</th>
              <th class="right">Receita PF</th>
              <th class="right">Receita PJ</th>
              <th class="right">Total</th>
              <th class="right">IRRF</th>
              <th class="right">Deducoes</th>
            </tr>
          </thead>
          <tbody>
            ${monthlyRows}
            <tr class="total-row">
              <td><strong>TOTAL</strong></td>
              <td class="right">R$ ${formatCurrency(summary.total_income_pf)}</td>
              <td class="right">R$ ${formatCurrency(summary.total_income_pj)}</td>
              <td class="right">R$ ${formatCurrency(summary.total_income)}</td>
              <td class="right text-amber">R$ ${formatCurrency(summary.total_irrf)}</td>
              <td class="right text-red">R$ ${formatCurrency(summary.total_expenses_deductible)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- PAGE 3: Deductible Expenses -->
      <div class="section page-break">
        <div class="section-title">DESPESAS DEDUTIVEIS (LIVRO CAIXA)</div>
        ${summary.expenses_by_category.length === 0 ?
      '<p>Nenhuma despesa dedutivel registrada no periodo.</p>' : `
          <table>
            <thead>
              <tr>
                <th>Categoria</th>
                <th class="right">Qtd.</th>
                <th class="right">Valor Total</th>
              </tr>
            </thead>
            <tbody>
              ${expensesRows}
              <tr class="total-row">
                <td><strong>TOTAL DEDUTIVEL</strong></td>
                <td class="right">${summary.expenses_by_category.reduce((sum, c) => sum + c.transaction_count, 0)}</td>
                <td class="right text-red">R$ ${formatCurrency(summary.total_expenses_deductible)}</td>
              </tr>
            </tbody>
          </table>
        `}
      </div>

      <!-- PAGE 4: PF Payers -->
      <div class="section page-break">
        <div class="section-title">RELACAO DE PAGADORES PESSOA FÍSICA</div>
        ${summary.payers_pf.length === 0 ?
      '<p>Nenhum pagador PF registrado no periodo.</p>' : `
          <table>
            <thead>
              <tr>
                <th>CPF</th>
                <th>Nome</th>
                <th class="right">Qtd.</th>
                <th class="right">Valor Total</th>
              </tr>
            </thead>
            <tbody>
              ${pfPayersRows}
            </tbody>
          </table>
        `}
      </div>

      <!-- PAGE 5: PJ Sources -->
      <div class="section page-break">
        <div class="section-title">RELACAO DE FONTES PAGADORAS PESSOA JURÍDICA</div>
        ${summary.payers_pj.length === 0 ?
      '<p>Nenhuma fonte PJ registrada no periodo.</p>' : `
          <table>
            <thead>
              <tr>
                <th>CNPJ</th>
                <th>Razao Social</th>
                <th class="right">Qtd.</th>
                <th class="right">Valor</th>
                <th class="right">IRRF</th>
              </tr>
            </thead>
            <tbody>
              ${pjSourcesRows}
            </tbody>
          </table>
        `}
      </div>

      <!-- PAGE 6: Disclaimer -->
      <div class="section page-break">
        <div class="section-title">AVISO IMPORTANTE</div>
        <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin-top: 15px;">
          <p style="margin-bottom: 12px; font-weight: bold; color: #92400e;">
            Este relatorio e um documento INFORMATIVO gerado automaticamente para fins de organizacao e planejamento tributario.
            NAO substitui a assessoria de um contador ou profissional qualificado.
          </p>
          <ul style="margin: 0; padding-left: 20px; font-size: 10px; color: #78350f;">
            <li style="margin-bottom: 8px;">Os valores apresentados sao <strong>estimativas</strong> baseadas nos dados registrados no sistema e nas aliquotas vigentes.</li>
            <li style="margin-bottom: 8px;">As aliquotas e faixas de impostos podem sofrer alteracoes pela legislacao. Sempre consulte a legislacao atualizada.</li>
            <li style="margin-bottom: 8px;">Para fins de declaracao oficial de Imposto de Renda junto a Receita Federal, os dados devem ser conferidos por um contador.</li>
            <li style="margin-bottom: 8px;">O regime tributario mais vantajoso depende de fatores especificos. Consulte seu contador antes de tomar decisoes.</li>
            <li>Este sistema nao oferece consultoria tributaria. As informacoes sao fornecidas como ferramenta de apoio a gestao.</li>
          </ul>
        </div>
      </div>

      <div class="footer">
        Relatorio gerado em ${formatDate(new Date())} - Documento informativo - Consulte um contador para fins oficiais
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate and share the IR Report PDF
 */
export async function generateIRPdf(summary: IRSummary): Promise<void> {
  const html = generateHtmlContent(summary);

  // Generate PDF - the file is created in a temp location
  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  // Share the PDF directly from the generated location
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Dossie IR ${summary.year}`,
      UTI: 'com.adobe.pdf',
    });
  }
}

/**
 * Get a writable temp directory using expo-print as fallback
 */
async function getWritableDirectory(): Promise<string> {
  // Try normal directories first
  const directory = LegacyFileSystem.cacheDirectory || LegacyFileSystem.documentDirectory;
  if (directory) {
    return directory;
  }

  // Fallback: use expo-print to discover a writable temp directory
  const { uri: tempPdfUri } = await Print.printToFileAsync({
    html: '<html><body></body></html>',
    base64: false,
  });

  // Extract the directory from the PDF path
  const lastSlash = tempPdfUri.lastIndexOf('/');
  const tempDir = tempPdfUri.substring(0, lastSlash + 1);

  // Clean up the dummy PDF
  try {
    await LegacyFileSystem.deleteAsync(tempPdfUri, { idempotent: true });
  } catch {
    // Ignore cleanup errors
  }

  return tempDir;
}

/**
 * Generate Excel workbook with all IR data
 */
function generateWorkbook(summary: IRSummary): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Resumo Anual
  const resumoData = [
    ['DOSSIE IMPOSTO DE RENDA'],
    [`Ano-Calendario: ${summary.year}`],
    [''],
    ['RESUMO ANUAL'],
    [''],
    ['Descricao', 'Valor (R$)'],
    ['Receita PF', summary.total_income_pf],
    ['Receita PJ', summary.total_income_pj],
    ['Receita Total', summary.total_income],
    ['IRRF Retido', summary.total_irrf],
    ['Despesas Dedutiveis', summary.total_expenses_deductible],
    ['Resultado Liquido', summary.net_result],
  ];

  // Add fiscal profile info if available
  if (summary.fiscal_profile) {
    resumoData.push(['']);
    resumoData.push(['IDENTIFICACAO DO CONTRIBUINTE']);
    if (summary.fiscal_profile.pf_enabled) {
      resumoData.push(['CPF', summary.fiscal_profile.pf_cpf || 'Nao informado']);
      resumoData.push(['CRO', summary.fiscal_profile.pf_cro || 'Nao informado']);
      if (summary.fiscal_profile.pf_address) {
        resumoData.push(['Endereco', summary.fiscal_profile.pf_address]);
      }
      if (summary.fiscal_profile.pf_city || summary.fiscal_profile.pf_state) {
        resumoData.push(['Cidade/UF', `${summary.fiscal_profile.pf_city || ''} - ${summary.fiscal_profile.pf_state || ''}`]);
      }
    }
    if (summary.fiscal_profile.pj_enabled) {
      resumoData.push(['CNPJ', summary.fiscal_profile.pj_cnpj || 'Nao informado']);
      resumoData.push(['Razao Social', summary.fiscal_profile.pj_razao_social || 'Nao informado']);
      if (summary.fiscal_profile.pj_regime_tributario) {
        const regimeLabel =
          summary.fiscal_profile.pj_regime_tributario === 'simples' ? 'Simples Nacional' :
            summary.fiscal_profile.pj_regime_tributario === 'lucro_presumido' ? 'Lucro Presumido' :
              summary.fiscal_profile.pj_regime_tributario === 'lucro_real' ? 'Lucro Real' :
                summary.fiscal_profile.pj_regime_tributario;
        resumoData.push(['Regime Tributario', regimeLabel]);
      }
    }
  }

  const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
  wsResumo['!cols'] = [{ wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

  // Sheet 2: Receitas por Mes
  const mensalData = [
    ['RECEITAS POR MES'],
    [''],
    ['Mes', 'Receita PF', 'Receita PJ', 'Total', 'IRRF', 'Deducoes'],
    ...summary.monthly.map(m => [
      m.month_name,
      m.income_pf,
      m.income_pj,
      m.income_total,
      m.irrf_total,
      m.expenses_deductible,
    ]),
    ['TOTAL', summary.total_income_pf, summary.total_income_pj, summary.total_income, summary.total_irrf, summary.total_expenses_deductible],
  ];

  const wsMensal = XLSX.utils.aoa_to_sheet(mensalData);
  wsMensal['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsMensal, 'Mensal');

  // Sheet 3: Despesas Dedutiveis
  const despesasData = [
    ['DESPESAS DEDUTIVEIS (LIVRO CAIXA)'],
    [''],
    ['Categoria', 'Quantidade', 'Valor Total'],
    ...summary.expenses_by_category.map(c => [
      c.category,
      c.transaction_count,
      c.total_amount,
    ]),
  ];

  if (summary.expenses_by_category.length > 0) {
    despesasData.push([
      'TOTAL',
      summary.expenses_by_category.reduce((sum, c) => sum + c.transaction_count, 0),
      summary.total_expenses_deductible,
    ]);
  }

  const wsDespesas = XLSX.utils.aoa_to_sheet(despesasData);
  wsDespesas['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsDespesas, 'Despesas');

  // Sheet 4: Pagadores PF
  const pfData = [
    ['RELACAO DE PAGADORES PESSOA FISICA'],
    [''],
    ['CPF', 'Nome', 'Qtd. Transacoes', 'Valor Total'],
    ...summary.payers_pf.map(p => [
      p.cpf,
      p.name,
      p.transaction_count,
      p.total_amount,
    ]),
  ];

  const wsPF = XLSX.utils.aoa_to_sheet(pfData);
  wsPF['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsPF, 'Pagadores PF');

  // Sheet 5: Fontes PJ
  const pjData = [
    ['RELACAO DE FONTES PAGADORAS PESSOA JURIDICA'],
    [''],
    ['CNPJ', 'Razao Social', 'Qtd. Transacoes', 'Valor Total', 'IRRF Retido'],
    ...summary.payers_pj.map(p => [
      p.cnpj,
      p.nome_fantasia || p.razao_social,
      p.transaction_count,
      p.total_amount,
      p.irrf_total,
    ]),
  ];

  const wsPJ = XLSX.utils.aoa_to_sheet(pjData);
  wsPJ['!cols'] = [{ wch: 18 }, { wch: 35 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsPJ, 'Fontes PJ');

  return wb;
}

/**
 * Export Excel spreadsheet (.xlsx) with all IR data
 */
export async function exportCSV(summary: IRSummary): Promise<void> {
  // Generate workbook
  const wb = generateWorkbook(summary);

  // Write to base64
  const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

  // Use expo-print to create a temp file, then use its path pattern for our xlsx
  const { uri: tempPdfUri } = await Print.printToFileAsync({
    html: '<html><body></body></html>',
    base64: false,
  });

  // Create xlsx file path by replacing the PDF path
  const xlsxUri = tempPdfUri.replace(/\.pdf$/i, '.xlsx');

  try {
    // Write the xlsx file
    await LegacyFileSystem.writeAsStringAsync(xlsxUri, wbout, {
      encoding: 'base64' as LegacyFileSystem.EncodingType,
    });

    // Clean up the dummy PDF
    try {
      await LegacyFileSystem.deleteAsync(tempPdfUri, { idempotent: true });
    } catch {
      // Ignore cleanup errors
    }

    // Share the Excel file
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(xlsxUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: `Planilha IR ${summary.year}`,
      });
    }
  } catch (error) {
    // Clean up temp PDF on error
    try {
      await LegacyFileSystem.deleteAsync(tempPdfUri, { idempotent: true });
    } catch {
      // Ignore
    }
    throw error;
  }
}
