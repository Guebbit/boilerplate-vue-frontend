/**
 * The context map's one home: "The whole map" in `docs/modules/start.md`.
 *
 * This spec parses that Mermaid block, whose edge lines are structured, and refuses an edge that
 * `dependsOn` does not allow. A module page links to the map instead of redrawing it.
 *
 * It does not compare the map to real imports: `dependsOn` plus lint already gate those, and a
 * self-reported scan is what the strategic-DDD page rejects. Arrow legend, from `start.md`:
 * `-->` conformist, `==>` customer-supplier, `-.->` published-language.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { moduleDependsOn, moduleFolderNames } from '../../scripts/module-manifest';

/** One edge of the map: `from` depends on `to`, in the way `kind` names. */
interface Edge {
    from: string;
    to: string;
    kind: string;
}

/** The module pages and the overview. */
const DOCS = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../docs/modules');

/** Mermaid arrow → relationship kind. */
const KIND_OF_ARROW: Record<string, string> = {
    '-->': 'conformist',
    '==>': 'customer-supplier',
    '-.->': 'published-language'
};

/** A node declaration, `id["label"]` or `id["<b>label</b>"]`. */
const NODE = /([A-Za-z]\w*)\["(?:<b>)?([^"<]+)(?:<\/b>)?"\]/g;

/**
 * One edge line: `from`, an optional node body, an arrow, an optional `|"kind"|` label, `to`. A
 * label that is not one of the three kinds (`mounts`, a route) marks a drawing that is not a
 * context-map edge, and the line is skipped.
 */
const EDGE =
    /^\s*([A-Z]\w*)(?:\["[^"]*"\])?\s*(-\.->|==>|-->)(?:\|"[^"|]*"\|)?\s*([A-Z]\w*)(?:\["[^"]*"\])?\s*$/i;

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
    const block = /```mermaid\n([\s\S]*?)```/.exec(markdown.slice(start));
    return block?.[1] ?? '';
};

/**
 * Reads the edges of one Mermaid flowchart, labels resolved from its node declarations.
 *
 * @param mermaid - The block body.
 * @returns Every edge, in order of appearance.
 */
const parseEdges = (mermaid: string): Edge[] => {
    const labels = new Map<string, string>();
    for (const [, id, label] of mermaid.matchAll(NODE)) if (!labels.has(id)) labels.set(id, label);
    return mermaid.split('\n').flatMap((line) => {
        const match = EDGE.exec(line);
        if (!match) return [];
        const [, from, arrow, to] = match;
        return [
            { from: labels.get(from) ?? from, to: labels.get(to) ?? to, kind: KIND_OF_ARROW[arrow] }
        ];
    });
};

/**
 * The node ids and labels a flowchart declares, and the raw ids at the ends of its context-map
 * edges, so a typo in an edge cannot hide behind the fallback that prints the id as the label.
 *
 * @param mermaid - The block body.
 */
const nodesAndEnds = (mermaid: string): { declared: Map<string, string>; ends: string[] } => {
    const declared = new Map<string, string>();
    for (const [, id, label] of mermaid.matchAll(NODE))
        if (!declared.has(id)) declared.set(id, label);
    const ends = mermaid.split('\n').flatMap((line) => {
        const match = EDGE.exec(line);
        return match ? [match[1], match[3]] : [];
    });
    return { declared, ends };
};

/** A stable text form of an edge. */
const key = ({ from, to, kind }: Edge): string => `${from} → ${to} (${kind})`;

/** The overview's Mermaid block. */
const overviewMermaid = (): string =>
    mermaidUnder(readFileSync(path.join(DOCS, 'start.md'), 'utf8'), 'The whole map');

/** The overview's edges. */
const overviewEdges = (): Edge[] => parseEdges(overviewMermaid());

describe('the context map in the overview', () => {
    it('reads some edges at all', () => {
        expect(overviewEdges().length).toBeGreaterThan(5);
    });

    /**
     * The map draws the full build. A build that left a module out has no `dependsOn` for it, so an
     * edge with an end in a missing module is not this build's to judge: only edges between
     * modules that are here are held to `dependsOn`.
     */
    it('draws only edges dependsOn allows', () => {
        const here = new Set(moduleFolderNames);
        const refused = overviewEdges()
            .filter(({ from, to }) => here.has(from) && here.has(to))
            .filter(({ from, to }) => !(moduleDependsOn[from] ?? []).includes(to))
            .map((edge) => key(edge));
        expect(refused).toEqual([]);
    });

    it('ends every edge on a node the map declares', () => {
        const { declared, ends } = nodesAndEnds(overviewMermaid());

        expect(ends.filter((id) => !declared.has(id))).toEqual([]);
    });

    it('draws a node for every module there is', () => {
        const { declared } = nodesAndEnds(overviewMermaid());
        const labels = new Set(declared.values());

        expect(moduleFolderNames.filter((name) => !labels.has(name))).toEqual([]);
    });
});
