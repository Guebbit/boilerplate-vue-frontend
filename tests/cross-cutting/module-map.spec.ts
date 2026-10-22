/**
 * The context map, held between its two homes.
 *
 * Each module's docs page (`docs/modules/<m>.md`, "The map") is the one source of the kind of every
 * edge; `docs/modules/index.md` ("The whole map") is the overview. This spec parses the Mermaid
 * edge lines of both, which are structured, and refuses a map that disagrees with itself:
 *
 *   (a) the union of the page edges is the overview's edge set, each with the same kind;
 *   (b) every edge `a → b` appears on both `a.md` and `b.md`;
 *   (c) every outgoing edge `a → b` is one `MODULE_EDGES[a]` allows;
 *   (d) the overview's totals row counts the edges and the modules that are really there.
 *
 * It does not compare the map to real imports: `MODULE_EDGES` plus lint already gate those, and a
 * self-reported scan is what the strategic-DDD page rejects. Arrow legend, from `index.md`:
 * `-->` conformist, `==>` customer-supplier, `-.->` published-language.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODULE_EDGES } from '../../scripts/module-edges';

/** One edge of the map: `from` depends on `to`, in the way `kind` names. */
interface Edge {
    from: string;
    to: string;
    kind: string;
}

/** The repo root, two levels above this file. */
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** The module pages and the overview. */
const DOCS = path.join(ROOT, 'docs/modules');

/** Mermaid arrow → relationship kind. */
const KIND_OF_ARROW: Record<string, string> = {
    '-->': 'conformist',
    '==>': 'customer-supplier',
    '-.->': 'published-language'
};

/** A node declaration, `id["label"]` or `id["<b>label</b>"]`. */
const NODE = /([A-Za-z]\w*)\["(?:<b>)?([^"<]+)(?:<\/b>)?"]/g;

/**
 * One edge line: `from`, an optional node body, an arrow, an optional `|"kind"|` label, `to`. A
 * label that is not one of the three kinds (`mounts`, a route) marks a drawing that is not a
 * context-map edge, and the line is skipped.
 */
const EDGE =
    /^\s*([A-Za-z]\w*)(?:\["[^"]*"])?\s*(-\.->|==>|-->)(?:\|"([^"|]*)"\|)?\s*([A-Za-z]\w*)(?:\["[^"]*"])?\s*$/;

/**
 * The text of the first Mermaid block under a heading.
 *
 * @param markdown - A docs page.
 * @param heading - The `## ` heading to look under.
 * @returns The block's body, or `''` when the page has none.
 */
const mermaidUnder = (markdown: string, heading: string): string => {
    const start = markdown.indexOf(`## ${heading}`);
    if (start === -1) return '';
    const block = /```mermaid\n([\S\s]*?)```/.exec(markdown.slice(start));
    return block?.[1] ?? '';
};

/**
 * Reads the edges of one Mermaid flowchart, labels resolved from its node declarations.
 *
 * @param mermaid - The block body.
 * @param labelled - Whether an edge must carry its kind as a label (a page's edges do).
 * @returns Every edge, in order of appearance.
 */
export const parseEdges = (mermaid: string, labelled = false): Edge[] => {
    const labels = new Map<string, string>();
    for (const [, id, label] of mermaid.matchAll(NODE)) if (!labels.has(id)) labels.set(id, label);
    return mermaid.split('\n').flatMap((line) => {
        const match = EDGE.exec(line);
        if (!match) return [];
        const [, from, arrow, label, to] = match;
        const kind = KIND_OF_ARROW[arrow];
        // A page labels its arrows with the kind; the overview labels none and the arrow speaks.
        if (label === undefined ? labelled : label !== kind) return [];
        return [{ from: labels.get(from) ?? from, to: labels.get(to) ?? to, kind }];
    });
};

/** A stable text form of an edge, for set comparison. */
const key = ({ from, to, kind }: Edge): string => `${from} → ${to} (${kind})`;

/**
 * Compares a set of page maps with the overview.
 *
 * @param pages - Module name → the edges drawn on its page.
 * @param overview - The overview's edges.
 * @returns A list of human-readable disagreements; empty when the map holds together.
 */
export const mapDisagreements = (pages: Map<string, Edge[]>, overview: Edge[]): string[] => {
    const problems: string[] = [];
    const union = new Set([...pages.values()].flat().map((edge) => key(edge)));
    const whole = new Set(overview.map((edge) => key(edge)));
    for (const edge of union)
        if (!whole.has(edge)) problems.push(`on a page but not in the overview: ${edge}`);
    for (const edge of whole)
        if (!union.has(edge)) problems.push(`in the overview but on no page: ${edge}`);
    for (const edge of overview)
        for (const side of [edge.from, edge.to])
            if (!(pages.get(side) ?? []).some((drawn) => key(drawn) === key(edge)))
                problems.push(`missing from ${side}.md: ${key(edge)}`);
    return problems;
};

/** Module name → the edges its page draws under "The map". */
const pageMaps = (): Map<string, Edge[]> =>
    new Map(
        readdirSync(DOCS)
            .filter((file) => file.endsWith('.md'))
            .flatMap((file) => {
                const edges = parseEdges(
                    mermaidUnder(readFileSync(path.join(DOCS, file), 'utf8'), 'The map'),
                    true
                );
                return edges.length > 0 ? [[file.replace(/\.md$/, ''), edges] as const] : [];
            })
    );

/** The overview's edges. */
const overviewEdges = (): Edge[] =>
    parseEdges(mermaidUnder(readFileSync(path.join(DOCS, 'index.md'), 'utf8'), 'The whole map'));

describe('the context map between the module pages and the overview', () => {
    it('reads some edges at all', () => {
        expect(overviewEdges().length).toBeGreaterThan(5);
        expect(pageMaps().size).toBeGreaterThan(5);
    });

    it('agrees: same edges, same kinds, each on both of its pages', () => {
        expect(mapDisagreements(pageMaps(), overviewEdges())).toEqual([]);
    });

    it('draws only edges MODULE_EDGES allows', () => {
        const refused = overviewEdges()
            .filter(({ from, to }) => !(MODULE_EDGES[from] ?? []).includes(to))
            .map((edge) => key(edge));
        expect(refused).toEqual([]);
    });

    it('counts the edges and modules the totals row claims', () => {
        const index = readFileSync(path.join(DOCS, 'index.md'), 'utf8');
        const row = /\|\s*(\d+)(?:\s*\|\s*\d+){5}\s*\|\s*(\d+)\s*\|/.exec(index);
        const folders = readdirSync(path.join(ROOT, 'src/modules'), { withFileTypes: true }).filter(
            (entry) => entry.isDirectory()
        );
        expect(Number(row?.[1])).toBe(folders.length);
        expect(Number(row?.[2])).toBe(overviewEdges().length);
    });
});

describe('mapDisagreements', () => {
    const ab: Edge = { from: 'a', to: 'b', kind: 'conformist' };

    it('accepts a map that agrees', () => {
        const pages = new Map([
            ['a', [ab]],
            ['b', [ab]]
        ]);
        expect(mapDisagreements(pages, [ab])).toEqual([]);
    });

    it('names an edge removed from one page', () => {
        const pages = new Map([
            ['a', [ab]],
            ['b', []]
        ]);
        expect(mapDisagreements(pages, [ab])).toEqual([`missing from b.md: ${key(ab)}`]);
    });

    it('names an edge reversed on a page', () => {
        const reversed: Edge = { from: 'b', to: 'a', kind: 'conformist' };
        const pages = new Map([
            ['a', [reversed]],
            ['b', [reversed]]
        ]);
        expect(mapDisagreements(pages, [ab]).length).toBeGreaterThan(0);
    });

    it('names an edge relabelled on a page', () => {
        const relabelled: Edge = { ...ab, kind: 'published-language' };
        const pages = new Map([
            ['a', [relabelled]],
            ['b', [relabelled]]
        ]);
        expect(mapDisagreements(pages, [ab])).toContain(
            `on a page but not in the overview: ${key(relabelled)}`
        );
    });
});
