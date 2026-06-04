const FORMULA_PREFIX_PATTERN = /^\s*[=+\-@\t\r]/;

export function csvCell(value: unknown): string {
  let text = value == null ? '' : String(value);

  if (typeof value !== 'number' && FORMULA_PREFIX_PATTERN.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

export function buildCsv(
  rows: unknown[][],
  options: { delimiter?: ',' | ';'; bom?: boolean } = {},
): string {
  const delimiter = options.delimiter ?? ',';
  const body = rows.map((row) => row.map(csvCell).join(delimiter)).join('\n');
  return options.bom === false ? body : `\uFEFF${body}`;
}

export function csvBlob(rows: unknown[][], options?: { delimiter?: ',' | ';'; bom?: boolean }): Blob {
  return new Blob([buildCsv(rows, options)], { type: 'text/csv;charset=utf-8' });
}
