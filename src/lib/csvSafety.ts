/**
 * Neutralizes CSV formula injection. When a cell's first character is one of
 * `= + - @ \t \r`, spreadsheet apps (Excel, Google Sheets, LibreOffice) parse
 * it as a formula, not literal text — e.g. `=HYPERLINK("http://evil","x")`
 * executes when the file is opened. Any exported field can carry
 * user-controlled text (client names, notes, machine names, reasons), so
 * every CSV writer must run cell values through this before serializing.
 * Prefixing with a single quote is the standard mitigation: spreadsheet
 * apps render it as literal text and drop the leading quote from the view.
 */
export function sanitizeCsvCell(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}
