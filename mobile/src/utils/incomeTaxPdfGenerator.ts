import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
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
        color: #0D9488;
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
        border-left: 4px solid #0D9488;
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
      .text-teal { color: #0D9488; }
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
          ${summary.fiscal_profile.pf_address ? `<p>Endereco: ${summary.fiscal_profile.pf_address}</p>` : ''}
          ${summary.fiscal_profile.pf_city || summary.fiscal_profile.pf_state ?
            `<p>${summary.fiscal_profile.pf_city || ''} - ${summary.fiscal_profile.pf_state || ''}</p>` : ''}
        ` : ''}
        ${summary.fiscal_profile.pj_enabled ? `
          <p>CNPJ: ${summary.fiscal_profile.pj_cnpj || 'Nao informado'}</p>
          <p>Razao Social: ${summary.fiscal_profile.pj_razao_social || 'Nao informado'}</p>
          ${summary.fiscal_profile.pj_regime_tributario ? `
            <p>Regime: ${
              summary.fiscal_profile.pj_regime_tributario === 'simples' ? 'Simples Nacional' :
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
        <div class="section-title">RELACAO DE PAGADORES PESSOA FISICA</div>
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
        <div class="section-title">RELACAO DE FONTES PAGADORAS PESSOA JURIDICA</div>
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

      <div class="footer">
        Relatorio gerado em ${formatDate(new Date())} - Documento informativo para fins de conferencia
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

  // Generate PDF
  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  // Rename file to meaningful name
  const pdfName = `dossie-ir-${summary.year}.pdf`;
  const newUri = FileSystem.documentDirectory + pdfName;

  await FileSystem.moveAsync({
    from: uri,
    to: newUri,
  });

  // Share the PDF
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(newUri, {
      mimeType: 'application/pdf',
      dialogTitle: `Dossie IR ${summary.year}`,
      UTI: 'com.adobe.pdf',
    });
  }
}

/**
 * Generate CSV content for export
 */
export function generateIncomeCSV(summary: IRSummary): string {
  const headers = ['Mes', 'Receita PF', 'Receita PJ', 'Total', 'IRRF', 'Deducoes'];
  const rows = summary.monthly.map(m => [
    m.month_name,
    m.income_pf.toFixed(2),
    m.income_pj.toFixed(2),
    m.income_total.toFixed(2),
    m.irrf_total.toFixed(2),
    m.expenses_deductible.toFixed(2),
  ]);

  // Add total row
  rows.push([
    'TOTAL',
    summary.total_income_pf.toFixed(2),
    summary.total_income_pj.toFixed(2),
    summary.total_income.toFixed(2),
    summary.total_irrf.toFixed(2),
    summary.total_expenses_deductible.toFixed(2),
  ]);

  return [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
}

export function generateExpenseCSV(summary: IRSummary): string {
  const headers = ['Categoria', 'Quantidade', 'Valor Total'];
  const rows = summary.expenses_by_category.map(c => [
    c.category,
    c.transaction_count.toString(),
    c.total_amount.toFixed(2),
  ]);

  return [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
}

/**
 * Export CSV files and share
 */
export async function exportCSV(summary: IRSummary): Promise<void> {
  const incomeCSV = generateIncomeCSV(summary);
  const expenseCSV = generateExpenseCSV(summary);

  // Save income CSV
  const incomeUri = FileSystem.documentDirectory + `receitas-ir-${summary.year}.csv`;
  await FileSystem.writeAsStringAsync(incomeUri, '\ufeff' + incomeCSV, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  // Save expense CSV
  const expenseUri = FileSystem.documentDirectory + `despesas-ir-${summary.year}.csv`;
  await FileSystem.writeAsStringAsync(expenseUri, '\ufeff' + expenseCSV, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  // Share income CSV
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(incomeUri, {
      mimeType: 'text/csv',
      dialogTitle: `Receitas IR ${summary.year}`,
    });
  }
}
