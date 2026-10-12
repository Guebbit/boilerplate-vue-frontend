/**
 * @module
 * Client-side CSV for the stats tables, built from the rows already on screen. A cell that a
 * spreadsheet would read as a formula is neutralised: a product or category title is text a shop
 * owner typed, and it ends up in a file somebody opens in Excel (OWASP "CSV Injection").
 */

/**
 * One cell: text, a number, or nothing.
 */
export type CsvCell = string | number | undefined;

/**
 * Characters that make a spreadsheet treat a text cell as a formula (OWASP's list), plus the tab
 * and carriage return some programs strip before looking.
 */
const FORMULA_START = /^[\t\r+=@-]/;

/**
 * Escapes one cell for a CSV file.
 *
 * @param cell - The value.
 * @returns A number as itself; text prefixed with `'` when it would read as a formula, and quoted
 *  when it holds a comma, quote or line break.
 */
export const escapeCsvCell = (cell: CsvCell): string => {
    if (cell === undefined) return '';
    if (typeof cell === 'number') return Number.isFinite(cell) ? String(cell) : '';
    const safe = FORMULA_START.test(cell) ? `'${cell}` : cell;
    return /[\n\r",]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
};

/**
 * Builds a CSV document.
 *
 * @param header - The column titles.
 * @param rows - The data rows, in column order.
 * @returns The file's text, CRLF-separated as RFC 4180 asks.
 */
export const toCsv = (header: string[], rows: CsvCell[][]): string =>
    [header, ...rows].map((row) => row.map((cell) => escapeCsvCell(cell)).join(',')).join('\r\n');
