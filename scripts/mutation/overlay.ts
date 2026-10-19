/**
 * @module
 * Lays a partial Stryker run (`npm run test:mutation -- --mutate <file>`) over the whole report
 * already on disk, so `reports/mutation/` keeps one report of every file.
 *
 * Test and mutant ids are renumbered: Stryker numbers them per report, so two reports collide.
 * The backend's `scripts/mutation/ci/merge.ts` holds the same overlay beside its sweep merge.
 *
 * See: docs/tools/mutation-testing.md#which-file-is-what
 */

/** A mutant as Stryker's JSON report records it; fields this does not read pass through. */
interface ReportMutant {
    id: string;
    coveredBy?: string[];
    killedBy?: string[];
    [field: string]: unknown;
}

/** A test as Stryker's JSON report records it. */
interface ReportTest {
    id: string;
    name: string;
    location?: { start: { line: number; column: number } };
    [field: string]: unknown;
}

/** The subset of Stryker's `mutation-testing-report-schema` this reads and writes. */
export interface StrykerReport {
    files: Record<string, { mutants: ReportMutant[]; [field: string]: unknown }>;
    testFiles?: Record<string, { tests: ReportTest[]; [field: string]: unknown }>;
    [field: string]: unknown;
}

/**
 * Re-keys every report's tests into one list per test file, by file + name + line, and returns
 * each report's old-id → new-id map. The first report to name a test keeps its entry.
 */
const mergeTests = (
    reports: readonly StrykerReport[]
): { testFiles: NonNullable<StrykerReport['testFiles']>; idMaps: Map<string, string>[] } => {
    const testFiles: NonNullable<StrykerReport['testFiles']> = {};
    const canonical = new Map<string, string>();

    const idMaps = reports.map((report) => {
        const idMap = new Map<string, string>();
        for (const [file, { tests, ...rest }] of Object.entries(report.testFiles ?? {})) {
            testFiles[file] ??= { ...rest, tests: [] };
            for (const test of tests) {
                const key = `${file}|${test.name}|${test.location?.start.line ?? ''}`;
                let id = canonical.get(key);
                if (id === undefined) {
                    id = String(canonical.size);
                    canonical.set(key, id);
                    testFiles[file].tests.push({ ...test, id });
                }
                idMap.set(test.id, id);
            }
        }
        return idMap;
    });

    return { testFiles, idMaps };
};

/**
 * A whole report with a partial run laid over it: each file the partial run measured takes its
 * new result, every other file keeps the whole report's.
 *
 * @param whole the report already on disk — a pulled nightly's, or an earlier run's
 * @param partial the run that just finished
 */
export const overlayReport = (whole: StrykerReport, partial: StrykerReport): StrykerReport => {
    // The partial run first, so a test both reports know keeps its newer entry.
    const { testFiles, idMaps } = mergeTests([partial, whole]);
    const remap = (index: number, ids?: string[]) => ids?.map((id) => idMaps[index].get(id) ?? id);
    const kept = Object.entries(whole.files).filter(([file]) => !(file in partial.files));

    let nextId = 0;
    const files = Object.fromEntries(
        [
            ...kept.map(([file, entry]) => ({ file, entry, index: 1 })),
            ...Object.entries(partial.files).map(([file, entry]) => ({ file, entry, index: 0 }))
        ].map(({ file, entry, index }) => [
            file,
            {
                ...entry,
                mutants: entry.mutants.map((mutant) => ({
                    ...mutant,
                    id: String(nextId++),
                    coveredBy: remap(index, mutant.coveredBy),
                    killedBy: remap(index, mutant.killedBy)
                }))
            }
        ])
    );

    return { ...whole, files, testFiles };
};

/**
 * Stryker's own HTML page with another report in it — the page a run wrote, with its
 * `app.report = …` line swapped, so the viewer is exactly the version Stryker ships.
 *
 * @param template the `index.html` the run just wrote
 * @param report the report to show
 * @throws {Error} when the template has no `app.report =` line (a Stryker upgrade changed it)
 */
export const renderHtml = (template: string, report: StrykerReport): string => {
    const lines = template.split('\n');
    const at = lines.findIndex((line) => line.trimStart().startsWith('app.report = '));
    if (at === -1)
        throw new Error(
            'Stryker HTML template has no `app.report =` line — has its layout changed?'
        );

    // Stryker's own escape: a `<` inside a JSON string cannot close the surrounding <script>.
    const json = JSON.stringify(report).replaceAll('<', '<"+"');
    lines[at] = `${lines[at].slice(0, lines[at].indexOf('app.report = '))}app.report = ${json};`;
    return lines.join('\n');
};
