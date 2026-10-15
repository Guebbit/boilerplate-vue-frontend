/**
 * The route table on `docs/theory/sitemap.md` is generated from the enabled modules' route
 * records, and this is the generator AND its guard: the page says its rows "cannot disagree" with
 * the routes, which is only true while something refuses a page that has drifted.
 *
 * Why a spec and not a script: the records lazy-load `.vue` views through `@/` aliases, which only
 * the Vitest/Vite pipeline resolves — the same reason `wire-modules.ts` lives here.
 *
 *   - Run as a test, it fails with the block the page should hold.
 *   - `UPDATE_SITEMAP=1 npx vitest run tests/cross-cutting/sitemap-document.spec.ts` rewrites the block
 *     between the two markers; `npx prettier --write docs/theory/sitemap.md` then aligns it.
 *
 * Rows are compared as cell lists, not as text, so Prettier's column padding never matters.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RouteRecordRaw } from 'vue-router';
import { enabledModules } from '@/modules';

/** The generated sitemap page. */
const PAGE = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../docs/theory/sitemap.md'
);

/** Marks where the generated table starts in the page. */
const START = '<!-- sitemap:start -->';

/** Marks where the generated table ends in the page. */
const END = '<!-- sitemap:end -->';

/**
 * The view file a route lazy-loads, as `views/<File>.vue`, or `—` for a routeless component.
 *
 * Vite rewrites `() => import('@/modules/x/views/X.vue')` to a `__vite_ssr_dynamic_import__` call
 * whose argument is the resolved path, so the loader's own source names the file.
 */
const viewOf = (route: RouteRecordRaw): string => {
    const source = typeof route.component === 'function' ? String(route.component) : '';
    return /\/(views\/[^"']+\.vue)["']/.exec(source)?.[1] ?? '—';
};

/**
 * Where a module's cell links: its own page, or, for the one module that has none (`example`,
 * which exists to be copied), the section of the theory page that explains it.
 */
const pageLinkOf = (moduleName: string): string =>
    existsSync(path.resolve(PAGE, '../../modules', `${moduleName}.md`))
        ? `../modules/${moduleName}.md`
        : './modules.md#adding-and-deleting-a-domain';

/**
 * One row's cells, in the table's column order.
 */
const cellsOf = (moduleName: string, route: RouteRecordRaw): string[] => {
    const can = route.meta?.can as [string, string] | undefined;
    return [
        `[\`${moduleName}\`](${pageLinkOf(moduleName)})`,
        `\`${route.path}\``,
        `\`${String(route.name)}\``,
        `\`${route.meta?.access ?? 'public'}\``,
        can ? `\`${can.join(' ')}\`` : '—',
        viewOf(route) === '—' ? '`—`' : `\`${viewOf(route)}\``
    ];
};

/**
 * Every row the enabled modules contribute, in module then route order.
 */
const expectedRows = (): string[][] =>
    enabledModules.flatMap(({ name, routes }) => routes.map((route) => cellsOf(name, route)));

/**
 * One table row from its cells.
 */
const markdownRow = (cells: string[]): string => `| ${cells.join(' | ')} |`;

/**
 * The generated block: header, rows, and the count sentence, ready to sit between the markers.
 */
const expectedBlock = (): string => {
    const rows = expectedRows();
    const modules = new Set(rows.map(([module]) => module)).size;
    const header = ['Module', 'Path', 'Route name', 'Access', 'Permission', 'View'];
    return [
        markdownRow(header),
        markdownRow(header.map(() => '---')),
        ...rows.map((cells) => markdownRow(cells)),
        '',
        `${String(rows.length)} screens across ${String(modules)} modules.`
    ].join('\n');
};

/**
 * The block the page currently holds, or undefined when the markers are missing.
 */
const currentBlock = (text: string): string | undefined => {
    const start = text.indexOf(START);
    const end = text.indexOf(END);
    return start === -1 || end === -1 ? undefined : text.slice(start + START.length, end).trim();
};

/**
 * A markdown table block reduced to comparable data: trimmed cells per row, separator dropped,
 * and the trailing count sentence.
 */
const normalised = (block: string): { rows: string[][]; count: string } => {
    const lines = block.split('\n').map((line) => line.trim());
    return {
        rows: lines
            .filter((line) => line.startsWith('|') && !/^\|[\s:|-]+\|$/.test(line))
            .map((line) =>
                line
                    .slice(1, -1)
                    .split('|')
                    .map((cell) => cell.trim())
            ),
        count: lines.find((line) => line.includes('screens across')) ?? ''
    };
};

describe('docs/theory/sitemap.md', () => {
    it('lists exactly the routes the enabled modules contribute', () => {
        const text = readFileSync(PAGE, 'utf8');

        if (process.env.UPDATE_SITEMAP === '1') {
            const start = text.indexOf(START) + START.length;
            const end = text.indexOf(END);
            writeFileSync(
                PAGE,
                `${text.slice(0, start)}\n\n${expectedBlock()}\n\n${text.slice(end)}`
            );
            return;
        }

        const held = currentBlock(text);
        expect(held, `${PAGE} needs the ${START} / ${END} markers`).toBeDefined();
        expect(normalised(held ?? '')).toEqual(normalised(expectedBlock()));
    });

    it('is checking a real population', () => {
        expect(expectedRows().length).toBeGreaterThan(0);
    });
});
