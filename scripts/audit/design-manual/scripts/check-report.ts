/**
 * @module
 * The citation check of the design review: the one part of it a program can decide.
 *
 * "The model proposes. A deterministic oracle disposes." A design verdict has no oracle, but a
 * citation does: the tile must exist, the line must exist. A line number is the citation most
 * likely to be invented and the cheapest to check. Pure; `check.ts` is the CLI.
 */

/**
 * Where a row's citations are looked up. The CLI backs it with the manifest and the disk; a test
 * backs it with a fixture.
 */
export interface CitationSources {
    /** Repo-relative tile paths the manifest lists. */
    manifestTiles: ReadonlySet<string>;
    /** Whether a repo-relative file exists on disk. */
    fileExists: (file: string) => boolean;
    /** The number of lines of a repo-relative source file, or `undefined` when it is missing. */
    lineCount: (file: string) => number | undefined;
}

/**
 * One citation that does not hold.
 */
export interface CitationFailure {
    /** The row's id cell, or `row <n>` when it has none. */
    row: string;
    /** The column that failed. */
    column: 'tile' | 'source' | 'item' | 'severity' | 'fix' | 'table';
    /** What is wrong, in a sentence. */
    reason: string;
}

/**
 * The outcome of checking one findings file.
 */
export interface CheckResult {
    /** How many finding rows were looked at. */
    checked: number;
    /** Every failure, in row order. */
    failures: CitationFailure[];
}

/** The checklist ids the review is built on: D1–D16. */
const CHECKLIST_ITEM = /^D(?:[1-9]|1[0-6])$/;

/** A reviewer-added item: `+ <name> — <anchor>`. The anchor is what makes it more than taste. */
const ADDED_ITEM = /^\+\s*\S.*\s—\s*\S/;

/** `path/to/file.ext:12` or `path/to/file.ext:12-18`. */
const SOURCE_CITATION = /^(?<file>[^\s:]+):(?<from>\d+)(?:-(?<to>\d+))?$/;

/** A pipe that does not close an escaped `\|`. */
const UNESCAPED_PIPE = /(?<!\\)\|/;

/** Splits one markdown table line into trimmed cells, without the outer pipes. */
const cellsOf = (line: string): string[] =>
    line
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split(UNESCAPED_PIPE)
        .map((cell) => cell.trim().replaceAll(String.raw`\|`, '|'));

/** Strips the backticks a reviewer wraps a path in. */
const unquote = (cell: string): string => cell.replaceAll('`', '').trim();

/** Which column holds what, found from the header cells. */
type Columns = Partial<Record<'id' | 'item' | 'tile' | 'source' | 'severity' | 'fix', number>>;

/** Maps the header cells of a findings table to column positions. */
const columnsOf = (header: string[]): Columns => {
    const find = (matches: (cell: string) => boolean): number | undefined => {
        const index = header.findIndex((cell) => matches(cell.toLowerCase()));
        return index === -1 ? undefined : index;
    };
    return {
        id: find((cell) => cell === 'id'),
        item: find((cell) => cell === 'item'),
        tile: find((cell) => cell === 'tile'),
        source: find((cell) => cell.includes('file:line') || cell.includes('source')),
        severity: find((cell) => cell === 'severity'),
        fix: find((cell) => cell === 'fix')
    };
};

/** Whether a column set is a findings table: it has the two columns every check needs. */
const isFindingsTable = (columns: Columns): boolean =>
    columns.tile !== undefined && columns.severity !== undefined;

/** Says why a `file:line` citation does not resolve, or `undefined` when it does. */
const sourceProblemOf = (source: string, sources: CitationSources): string | undefined => {
    const parts: Partial<Record<'file' | 'from' | 'to', string>> | undefined =
        SOURCE_CITATION.exec(source)?.groups;
    if (parts?.file === undefined || parts.from === undefined)
        return `${source || '(empty)'} is not file:line`;

    const lines = sources.lineCount(parts.file);
    if (lines === undefined) return `${parts.file} does not exist`;
    if (Number(parts.from) < 1 || Number(parts.to ?? parts.from) > lines)
        return `${source} is outside ${parts.file} (${String(lines)} lines)`;
    return undefined;
};

/** Checks one finding row. */
const checkRow = (
    cells: string[],
    columns: Columns,
    row: string,
    sources: CitationSources
): CitationFailure[] => {
    const cell = (column: keyof Columns): string => {
        const index = columns[column];
        return index === undefined ? '' : unquote(cells.at(index) ?? '');
    };
    const failures: CitationFailure[] = [];
    const fail = (column: CitationFailure['column'], reason: string): void => {
        failures.push({ row, column, reason });
    };

    const tile = cell('tile');
    if (!sources.manifestTiles.has(tile))
        fail('tile', `${tile || '(empty)'} is not in the manifest`);
    else if (!sources.fileExists(tile)) fail('tile', `${tile} is in the manifest but not on disk`);

    const sourceProblem = sourceProblemOf(cell('source'), sources);
    if (sourceProblem !== undefined) fail('source', sourceProblem);

    const item = cell('item');
    if (!CHECKLIST_ITEM.test(item) && !ADDED_ITEM.test(item))
        fail('item', `${item || '(empty)'} is neither D1–D16 nor "+ name — anchor"`);

    if (!/^S[1-3]$/.test(cell('severity')))
        fail('severity', `${cell('severity') || '(empty)'} is not S1–S3`);
    if (!/[\p{L}\p{N}]/u.test(cell('fix'))) fail('fix', 'the fix is empty');

    return failures;
};

/**
 * Checks every finding row of a report against its sources.
 *
 * A findings table is any table whose header has a `tile` and a `severity` column. A report with
 * no table at all has no rows and passes; a report with tables but none of that shape fails, so a
 * mangled header cannot turn into a silent pass.
 */
export const checkReport = (markdown: string, sources: CitationSources): CheckResult => {
    const failures: CitationFailure[] = [];
    let checked = 0;
    let sawTable = false;
    let sawFindingsTable = false;
    let columns: Columns | undefined;
    let rowNumber = 0;

    for (const line of markdown.split('\n')) {
        if (!line.trim().startsWith('|')) {
            columns = undefined;
            continue;
        }
        sawTable = true;
        const cells = cellsOf(line);

        if (columns === undefined) {
            const candidate = columnsOf(cells);
            columns = isFindingsTable(candidate) ? candidate : {};
            sawFindingsTable ||= isFindingsTable(candidate);
            rowNumber = 0;
            continue;
        }
        if (cells.every((cell) => /^:?-{2,}:?$/.test(cell)) || !isFindingsTable(columns)) continue;

        rowNumber += 1;
        checked += 1;
        const id = columns.id === undefined ? '' : (cells.at(columns.id) ?? '');
        failures.push(...checkRow(cells, columns, id || `row ${String(rowNumber)}`, sources));
    }

    if (sawTable && !sawFindingsTable)
        failures.push({
            row: 'table',
            column: 'table',
            reason: 'no findings table with tile and severity columns'
        });

    return { checked, failures };
};
