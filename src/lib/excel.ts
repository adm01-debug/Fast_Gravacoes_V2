import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Thin write-only wrapper around `exceljs`.
 *
 * Replaces the previously used `xlsx` (SheetJS) package, which is unmaintained
 * and flagged by `npm audit` (prototype pollution / ReDoS in its *parsing*
 * code). This app only ever *writes* spreadsheets, so the helpers here cover
 * exactly that surface and keep the call sites small.
 */

export type Cell = string | number | boolean | null | undefined;

export interface SheetSpec {
  /** Worksheet tab name. Sanitized to Excel's constraints automatically. */
  name: string;
  /** Rows as arrays of cells (equivalent to the old `aoa_to_sheet`). */
  rows: Cell[][];
}

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// Excel worksheet names must be <= 31 chars and cannot contain : \ / ? * [ ]
function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[\\/?*[\]:]/g, ' ').trim() || 'Sheet';
  return cleaned.slice(0, 31);
}

function buildWorkbook(sheets: SheetSpec[]): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  for (const sheet of sheets) {
    const ws = workbook.addWorksheet(sanitizeSheetName(sheet.name));
    for (const row of sheet.rows) {
      // Normalize undefined -> null so exceljs renders an empty cell.
      ws.addRow(row.map((c) => (c === undefined ? null : c)));
    }
  }
  return workbook;
}

/**
 * Convert an array of plain objects into a header row + data rows
 * (equivalent to the old `XLSX.utils.json_to_sheet`). The keys of the first
 * object define the column order.
 */
export function objectsToRows(data: Array<Record<string, unknown>>): Cell[][] {
  if (!data.length) return [[]];
  const headers = Object.keys(data[0]);
  return [
    headers,
    ...data.map((row) => headers.map((h) => (row[h] ?? null) as Cell)),
  ];
}

/** Build the workbook and trigger a browser download. */
export async function downloadWorkbook(sheets: SheetSpec[], fileName: string): Promise<void> {
  const workbook = buildWorkbook(sheets);
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer], { type: XLSX_MIME }), fileName);
}
