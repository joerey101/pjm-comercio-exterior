/**
 * Minimal CSV parser (no external dependency): handles quoted fields,
 * escaped quotes (""), commas inside quotes, and CRLF/LF. Good enough for
 * the flat, small (thousands of rows, not millions) catalog files this
 * importer is designed for. XLSX/JSON are documented as future work — see
 * README "Próximos pasos".
 */
export function parseCsv(text: string): Record<string, string>[] {
  const cleanText = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows = parseCsvRows(cleanText);
  if (rows.length === 0) return [];

  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).filter((r) => r.some((cell) => cell.trim() !== '')).map((row) => {
    const record: Record<string, string> = {};
    header.forEach((key, i) => {
      record[key] = (row[i] ?? '').trim();
    });
    return record;
  });
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',' || char === ';') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}
