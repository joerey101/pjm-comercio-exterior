export interface ImportRowError {
  row: number;
  message: string;
}

export interface ImportParseResult<T> {
  rows: T[];
  errors: ImportRowError[];
  totalRows: number;
}

export function toNumberOrNull(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') return null;
  const n = Number(value.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function toDateOrNull(value: string | undefined): string | null {
  if (!value || value.trim() === '') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : value.trim();
}
