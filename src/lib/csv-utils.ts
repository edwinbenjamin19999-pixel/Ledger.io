/**
 * Safe CSV/TSV utility module — replaces the vulnerable xlsx package.
 * Handles both parsing uploaded CSV/TSV files and generating downloadable CSV templates.
 */

// ── Parsing ──────────────────────────────────────────────────────────────────

/**
 * Parse a CSV or TSV string into an array of objects keyed by header names.
 * Handles quoted fields, embedded commas, newlines inside quotes, and BOM.
 */
export function parseCSV(text: string, delimiter?: string): Record<string, string>[] {
  // Strip BOM
  const cleaned = text.replace(/^\uFEFF/, '');

  // Auto-detect delimiter if not provided
  if (!delimiter) {
    const firstLine = cleaned.split('\n')[0] || '';
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    delimiter = tabCount > commaCount && tabCount > semicolonCount
      ? '\t'
      : semicolonCount > commaCount
        ? ';'
        : ',';
  }

  const rows = parseCSVRows(cleaned, delimiter);
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim());
  return rows.slice(1)
    .filter(row => row.some(cell => cell.trim() !== ''))
    .map(row => {
      const obj: Record<string, string> = {};
      headers.forEach((header, i) => {
        obj[header] = (row[i] ?? '').trim();
      });
      return obj;
    });
}

function parseCSVRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++; // skip escaped quote
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        current.push(cell);
        cell = '';
      } else if (ch === '\r' && next === '\n') {
        current.push(cell);
        cell = '';
        rows.push(current);
        current = [];
        i++; // skip \n
      } else if (ch === '\n') {
        current.push(cell);
        cell = '';
        rows.push(current);
        current = [];
      } else {
        cell += ch;
      }
    }
  }

  // Flush last row
  if (cell !== '' || current.length > 0) {
    current.push(cell);
    rows.push(current);
  }

  return rows;
}

// ── Generation ───────────────────────────────────────────────────────────────

/**
 * Generate a CSV string from an array of objects.
 */
export function generateCSV(data: Record<string, string | number | null | undefined>[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const escape = (val: string) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes(';')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [
    headers.map(escape).join(','),
    ...data.map(row => headers.map(h => escape(String(row[h] ?? ''))).join(','))
  ];
  return '\uFEFF' + lines.join('\n'); // BOM för Excel compatibility
}

/**
 * Download a CSV string as a file.
 */
export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Read a File object (CSV/TSV) and parse it into records.
 */
export function readFileAsCSV(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const records = parseCSV(text);
        resolve(records);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file, 'UTF-8');
  });
}
