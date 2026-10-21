/**
 * @module
 * The ratchet over the invasive-CSS findings: a frozen baseline that only ever shrinks.
 *
 * A finding is keyed by file + check + anchor (a selector, a tag and class, a call), never by
 * line, so an edit above a hit does not move it. The baseline counts each key, because the same
 * anchor can occur twice in one file. Comparing the scan with it gives two lists: hits the
 * baseline does not know (new, refused) and baseline entries that no longer occur (fixed, to be
 * struck off). Shrinking rewrites the baseline with the smaller of the two counts; it never adds.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../../css-sources';
import type { CheckId, CssFinding } from './scan';

/** The baseline file, relative to the repo root. */
export const BASELINE_FILE = 'tests/cross-cutting/css-invasiveness.baseline.json';

/**
 * One known hit, or several with the same key.
 */
export interface BaselineEntry {
    /** The file, relative to the repo root. */
    file: string;
    /** The check that fires. */
    check: CheckId;
    /** The stable anchor (see {@link CssFinding.anchor}). */
    anchor: string;
    /** How many times the key occurs. */
    count: number;
}

/**
 * The baseline document.
 */
export interface Baseline {
    /** What the file is, for whoever opens it. */
    $comment: string;
    /** The known hits, sorted by key. */
    entries: BaselineEntry[];
}

/**
 * The ratchet key of a finding or an entry.
 *
 * @param entry - Anything with a file, a check and an anchor.
 * @returns `file | check | anchor`.
 */
export const keyOf = ({
    file,
    check,
    anchor
}: Pick<BaselineEntry, 'file' | 'check' | 'anchor'>): string => `${file} | ${check} | ${anchor}`;

/**
 * Counts findings per key.
 *
 * @param findings - The scan.
 * @returns One entry per key, sorted by key.
 */
export const tally = (findings: CssFinding[]): BaselineEntry[] => {
    const byKey = new Map<string, BaselineEntry>();
    for (const { file, check, anchor } of findings) {
        const key = keyOf({ file, check, anchor });
        const entry = byKey.get(key) ?? { file, check, anchor, count: 0 };
        byKey.set(key, { ...entry, count: entry.count + 1 });
    }
    return [...byKey.values()].toSorted((a, b) => keyOf(a).localeCompare(keyOf(b)));
};

/**
 * What changed against the baseline.
 */
export interface RatchetDiff {
    /** Keys over their baseline count, with the excess as `count`: new hits. */
    added: BaselineEntry[];
    /** Keys under their baseline count, with the shortfall as `count`: fixed hits to strike off. */
    gone: BaselineEntry[];
}

/** For each key of `a`, the amount it exceeds `b` by. */
const excess = (a: BaselineEntry[], b: BaselineEntry[]): BaselineEntry[] => {
    const other = new Map(b.map((entry) => [keyOf(entry), entry.count]));
    return a
        .map((entry) => ({ ...entry, count: entry.count - (other.get(keyOf(entry)) ?? 0) }))
        .filter((entry) => entry.count > 0);
};

/**
 * Compares a scan with the baseline.
 *
 * @param findings - The scan.
 * @param baseline - The known hits.
 * @returns The new hits and the struck-off ones.
 */
export const compareToBaseline = (
    findings: CssFinding[],
    baseline: BaselineEntry[]
): RatchetDiff => {
    const current = tally(findings);
    return { added: excess(current, baseline), gone: excess(baseline, current) };
};

/**
 * The baseline with fixed hits struck off: the smaller count per key, never a new key.
 *
 * @param findings - The scan.
 * @param baseline - The known hits.
 * @returns The shrunk entries.
 */
export const shrinkBaseline = (
    findings: CssFinding[],
    baseline: BaselineEntry[]
): BaselineEntry[] => {
    const current = new Map(tally(findings).map((entry) => [keyOf(entry), entry.count]));
    return baseline
        .map((entry) => ({
            ...entry,
            count: Math.min(entry.count, current.get(keyOf(entry)) ?? 0)
        }))
        .filter((entry) => entry.count > 0);
};

/** The one-line explanation written into the baseline file. */
const COMMENT =
    'Known invasive-CSS hits, frozen. New hits fail tests/cross-cutting/css-invasiveness.spec.ts; so does an entry that no longer occurs. Shrink with `npm run audit:css -- --shrink-baseline`; never add by hand.';

/**
 * Reads the baseline file.
 *
 * @returns Its entries.
 */
export const readBaseline = (): BaselineEntry[] =>
    (JSON.parse(readFileSync(path.join(ROOT, BASELINE_FILE), 'utf8')) as Baseline).entries;

/**
 * Writes the baseline file.
 *
 * @param entries - The entries to freeze.
 */
export const writeBaseline = (entries: BaselineEntry[]): void => {
    const document: Baseline = { $comment: COMMENT, entries };
    writeFileSync(path.join(ROOT, BASELINE_FILE), `${JSON.stringify(document, undefined, 4)}\n`);
};
