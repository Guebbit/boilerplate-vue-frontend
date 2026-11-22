/**
 * @module
 * The facts a docs page states about `package.json` and the generated contract, as pure checks
 * over text — `check-references.ts` supplies the pages and the files and reports what fails here.
 *
 * Kept apart from the file-path sweep because these need no git tree, only a page's text and a
 * list of names, which makes each rule a plain function a spec can drive with a fixture.
 *
 * WHAT IS CHECKED:
 *   1. Every `npm run <x>` a page tells a reader to type exists as a script (here or in the peer).
 *   2. Every package the dependencies page names is actually installed.
 *   3. Every name a code fence imports from `@api` / `@api/schemas` is really exported.
 *   4. Every page opens with a `type` and an `audience` in its front-matter (home page exempt).
 */

import { parse } from 'yaml';

/**
 * A page's text and where it lives, the unit every check below reports against.
 */
export interface DocumentPage {
    /** Repo-relative path, for the report. */
    path: string;
    /** The page's markdown. */
    text: string;
}

/**
 * The parts of a `package.json` the checks read.
 */
export interface PackageFacts {
    /** Script names. */
    scripts: string[];
    /** Runtime dependency names. */
    dependencies: string[];
    /** Dev dependency names. */
    devDependencies: string[];
}

/**
 * One claim that does not hold, with the page that makes it.
 */
export interface FactFinding {
    /** Page the claim is on. */
    page: string;
    /** What is wrong, in one line. */
    problem: string;
}

/**
 * Every `npm run <script>` a page names, inline or in a fence. A trailing `--` argument list is
 * not part of the name.
 *
 * @param text - A page's markdown.
 * @returns The distinct script names cited.
 */
export const npmScriptsCited = (text: string): string[] => [
    ...new Set([...text.matchAll(/\bnpm run ([\w.:-]+)/g)].map(([, name]) => name))
];

/**
 * Scripts a page tells a reader to run that exist in neither repo.
 *
 * @param pages - The pages to sweep.
 * @param known - Script names defined here or in the paired backend (the docs cite both).
 * @returns One finding per page and missing script.
 */
export const missingScripts = (pages: DocumentPage[], known: ReadonlySet<string>): FactFinding[] =>
    pages.flatMap(({ path, text }) =>
        npmScriptsCited(text)
            .filter((name) => !known.has(name))
            .map((name) => ({ page: path, problem: `\`npm run ${name}\` is not a script` }))
    );

/**
 * The package names in a dependency table's "Packages" column: code spans in the rows under the
 * given headings, second cell only, so prose elsewhere on the page cannot pass for a listing.
 *
 * @param text - The dependencies page's markdown.
 * @returns Distinct package-looking names (`vue`, `@scope/name`).
 */
export const listedPackages = (text: string): string[] => {
    const names = new Set<string>();
    for (const line of text.split('\n')) {
        if (!line.startsWith('|')) continue;
        const cell = line.split('|', 3)[2] ?? '';
        for (const [, span] of cell.matchAll(/`([^`]+)`/g))
            if (/^(?:@[\w.-]+\/)?[\w.-]+$/.test(span)) names.add(span);
    }
    return [...names];
};

/**
 * Packages the dependencies page lists that `package.json` does not install.
 *
 * @param page - The dependencies page.
 * @param installed - Every dependency and dev dependency name.
 * @returns One finding per stale listing.
 */
export const staleListings = (page: DocumentPage, installed: ReadonlySet<string>): FactFinding[] =>
    listedPackages(page.text)
        .filter((name) => !installed.has(name))
        .map((name) => ({ page: page.path, problem: `lists \`${name}\`, which is not installed` }));

/**
 * The names a page's code fences import from the generated contract (`@api`, `@api/schemas`).
 *
 * @param text - A page's markdown.
 * @returns `{ from, name }` per imported binding; a `type` marker and `as` alias are dropped.
 */
export const fencedContractImports = (text: string): { from: string; name: string }[] => {
    const fences = [...text.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map(([, body]) => body);
    return fences.flatMap((body) =>
        [
            ...body.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'(@api(?:\/schemas)?)'/g)
        ].flatMap(([, names, from]) =>
            names
                .split(',')
                .map(
                    (part) =>
                        part
                            .trim()
                            .replace(/^type\s+/, '')
                            .split(/\s+as\s+/, 1)[0]
                )
                .filter(Boolean)
                .map((name) => ({ from, name }))
        )
    );
};

/**
 * Fenced contract imports naming something the contract does not export.
 *
 * @param pages - The pages to sweep.
 * @param exportsOf - Export names per specifier (`@api`, `@api/schemas`).
 * @returns One finding per page and unknown name.
 */
export const unknownContractImports = (
    pages: DocumentPage[],
    exportsOf: Record<string, ReadonlySet<string>>
): FactFinding[] =>
    pages.flatMap(({ path, text }) =>
        fencedContractImports(text)
            .filter(({ from, name }) => !exportsOf[from].has(name))
            .map(({ from, name }) => ({
                page: path,
                problem: `imports \`${name}\` from '${from}', which does not export it`
            }))
    );

/**
 * The names a generated TypeScript file exports, read by pattern: the file is orval's output and
 * every export it makes is a plain `export <kind> Name` at column zero.
 *
 * @param source - The generated file's text.
 * @returns The exported names.
 */
export const exportedNames = (source: string): Set<string> =>
    new Set(
        [
            ...source.matchAll(
                /^export (?:declare )?(?:const|function|type|interface|enum|class) (\w+)/gm
            )
        ].map(([, name]) => name)
    );

/** The four kinds of page, one template each. */
const PAGE_TYPES: ReadonlySet<string> = new Set([
    'concept',
    'task',
    'reference',
    'troubleshooting'
]);

/** Who a page is for. */
const AUDIENCES: ReadonlySet<string> = new Set([
    'staff',
    'owner',
    'developer',
    'architect',
    'operator',
    'anyone'
]);

/** The one page that is a landing layout, not content. */
const HOME_PAGE = 'docs/index.md';

/**
 * What the leading `---` block of a page says.
 *
 * @param text - A page's markdown.
 * @returns The parsed keys; `{}` when the block is not a mapping; `undefined` when the page has no
 *   front-matter block.
 */
const frontMatterOf = (text: string): Record<string, unknown> | undefined => {
    const block = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text)?.[1];
    if (block === undefined) return undefined;
    // `yaml`'s parse: a mapping for a front-matter block; anything else is treated as empty.
    const parsed: unknown = parse(block);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
        ? Object.fromEntries(Object.entries(parsed))
        : {};
};

/**
 * Pages whose front-matter lacks a valid `type` or `audience`. The home page is exempt.
 *
 * @param pages - The pages to sweep.
 * @returns One finding per page and problem.
 */
export const missingFrontMatter = (pages: DocumentPage[]): FactFinding[] =>
    pages
        .filter(({ path }) => path !== HOME_PAGE)
        .flatMap(({ path, text }) => {
            const meta = frontMatterOf(text);
            if (!meta) return [{ page: path, problem: 'no front-matter block (type, audience)' }];

            const findings: FactFinding[] = [];
            if (typeof meta.type !== 'string' || !PAGE_TYPES.has(meta.type))
                findings.push({
                    page: path,
                    problem: `front-matter \`type\` must be one of ${[...PAGE_TYPES].join(', ')}`
                });

            const audience: unknown = meta.audience;
            const valid =
                Array.isArray(audience) &&
                audience.length > 0 &&
                audience.every((value) => typeof value === 'string' && AUDIENCES.has(value));
            if (!valid)
                findings.push({
                    page: path,
                    problem: `front-matter \`audience\` must be a non-empty list from ${[...AUDIENCES].join(', ')}`
                });
            return findings;
        });
