#!/usr/bin/env tsx
/**
 * Every file path the docs CLAIM exists, checked against the files that do — `npm run
 * check:docs-references`.
 *
 * `docs:build` already refuses a dead LINK between two pages. Nothing refuses a dead FACT, and a
 * page listing `models/serialize.ts` as this repo's property-tested surface reads as current to
 * everyone who has not opened the tree. That class of rot is silent, cheap to write, and this is
 * the only thing that looks for it.
 *
 * Mirrors `scripts/docs/check-references.ts` in the paired backend — the same idea, each repo
 * reading its own tree, its own aliases and its own peer. Neither is generated from the other.
 *
 * WHAT IS SWEPT, and why each narrowing matters:
 *   - Inline code spans only. A fenced block is a code SAMPLE — its imports describe an example,
 *     not this repo's tree, and sweeping them buries the real findings in illustration.
 *   - `./`-relative tokens are skipped. VitePress resolves those against the page, not the repo,
 *     and `docs:build` already fails on a dead one.
 *   - Resolution is by SUFFIX, so `stores/cart.ts` matches `src/modules/cart/stores/cart.ts`
 *     without every page having to spell a path from the root.
 *   - A `#anchor` riding on a path this repo tracks is checked too, against that page's own
 *     headings — a page renamed out from under a citation elsewhere still resolves as a FILE, and
 *     only the anchor half used to go unchecked. Limited to a page in THIS repo: the peer's
 *     headings are its own tree to answer for, not ours to parse.
 *   - `@`-prefixed tokens are rewritten through `tsconfig.app.json`'s own path aliases, so `@/x`
 *     is checked and `@vueuse/core` — matching no alias — is read as the npm package it is.
 *   - Tokens starting with `/` are routes, not files.
 *   - A slash alone does not make a path: `text/html`, `grafana/loki` and `vue/no-unused-vars`
 *     are a MIME type, a container image and a lint rule. A token qualifies only by ending in a
 *     real filename, or by starting at something that actually sits at the root of this repo.
 *   - A token starting with the paired repo's directory name is resolved over THERE. That is what
 *     makes citing it by its package name instead of its directory name a finding.
 *   - A line carrying `<!-- doc-paths:ignore -->` is skipped whole. Some prose has to NAME a path
 *     that is deliberately gone — a rename table's left column, a paragraph explaining why a file
 *     was merged away. The marker says "this line names an absent path on purpose", which is an
 *     argument a reader can check, unlike silence.
 *
 * The floors below are the point. A sweep that silently reads zero pages reports a clean tree
 * forever, which is worse than no sweep.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_BACKEND_PATH, resolveBackendPath } from '../pairing/paired-backend-path';
import {
    exportedNames,
    missingScripts,
    staleListings,
    unknownContractImports,
    unnamedOn,
    type DocumentPage,
    type FactFinding
} from './document-facts';

/** The repo root, two levels up from `scripts/docs/`. This package is ESM — no `__dirname`. */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Where this repo's path aliases are declared — the app config, not the solution root. */
const TSCONFIG = 'tsconfig.app.json';

/** The paired repo, addressed in prose by the directory it actually sits in. */
const PEER_DIRECTORY = path.basename(DEFAULT_BACKEND_PATH);

/**
 * The floors. Set just under what the tree currently holds, so ordinary editing never trips them
 * and a sweep that stops seeing the docs does. Raise them when the docs grow; never lower them to
 * make a run pass.
 */
const MIN_PAGES = 65;
const MIN_REFERENCES = 200;

/**
 * Paths that legitimately do not exist in a clean checkout, each with the reason it is exempt.
 * Prefix match. An entry here is an argument, not a mute button — a path with no reason to be
 * absent belongs in the findings.
 */
const ALLOWED: { prefix: string; reason: string }[] = [
    {
        prefix: 'reports/a11y/',
        reason: 'written by the accessibility sweep, absent until one runs'
    },
    { prefix: 'reports/e2e/', reason: 'written by the sharded e2e runner, absent until one runs' },
    { prefix: 'reports/mutation/', reason: 'written by a Stryker run, absent until one happens' },
    { prefix: 'reports/visual-diff/', reason: 'written by a visual-regression run' },
    { prefix: 'reports/audit/', reason: 'written by an audit prompt run' },
    { prefix: 'reports/test-report.json', reason: 'written by `test:unit:report`' },
    { prefix: 'reports/stryker-incremental.json', reason: "Stryker's local cache, gitignored" },
    { prefix: 'coverage/', reason: 'written by a coverage run, absent until one happens' },
    { prefix: 'node_modules/', reason: 'a dependency path, cited to locate one — not our tree' },
    { prefix: 'tests/e2e/videos/', reason: 'Cypress artefacts, written by a run' },
    { prefix: 'tests/e2e/screenshots/', reason: 'Cypress artefacts, written by a run' },
    { prefix: 'tests/e2e/downloads/', reason: 'Cypress artefacts, written by a run' },
    { prefix: 'tests_output/', reason: 'written by a test run' },
    { prefix: '.env', reason: 'a deployment writes it; only .env-example is tracked' },
    { prefix: 'docs/.vitepress/dist/', reason: 'the built site, written by docs:build' },
    { prefix: 'docs/.vitepress/cache/', reason: "vitepress's own scratch space" },
    { prefix: 'dist/', reason: 'the build output, written by build' },
    { prefix: 'dist-e2e/', reason: 'the e2e build output' }
];

/**
 * A filename: a non-empty stem and a known extension. `package.json` qualifies with no `/` in it;
 * a bare `.ts` naming the language does not.
 */
const FILENAME = /^[^.][^/]*\.(ts|tsx|js|cjs|mjs|json|ya?ml|md|vue|css|scss|sh|conf|lock)$/;

/**
 * Characters that mean this span is prose, a glob, a type or a command — never one real path.
 * `…` included: a page eliding the middle of a path is illustrating a shape, not citing a file.
 */
const NOT_A_PATH = /[\s!"'()*,<=>?[\]`{|}…]/;

/** Opt-out for a line that names an absent path deliberately. See the module header. */
const IGNORE_LINE = '<!-- doc-paths:ignore -->';

/** One unresolved claim, and the page that makes it. */
interface Finding {
    page: string;
    token: string;
}

/**
 * A page's heading slugs, VitePress's own way — lowercased, inline `` ` ``/`*`/`_` stripped,
 * punctuation dropped, spaces to hyphens — plus any explicit `{#custom-id}` a heading carries.
 * Approximate on purpose: VitePress de-duplicates a repeated heading with a `-1`/`-2` suffix, and
 * this does not, so a genuine collision under-reports rather than over-reports.
 */
const slugify = (heading: string): string =>
    heading
        .replaceAll(/[*_`~]/g, '')
        .trim()
        .toLowerCase()
        .replaceAll(/[^\s\w-]/g, '')
        .replaceAll(/\s+/g, '-')
        .replaceAll(/-+/g, '-')
        .replaceAll(/^-|-$/g, '');

/** Every anchor a markdown page answers to: one per heading, its own `{#id}` if it wrote one. */
const headingSlugs = (markdown: string): Set<string> => {
    const slugs = new Set<string>();

    for (const line of markdown.split('\n')) {
        const heading = /^#{1,6}\s+(.+)$/.exec(line)?.[1];
        if (!heading) continue;

        const explicit = /{#([\w-]+)}\s*$/.exec(heading)?.[1];
        slugs.add(explicit ?? slugify(heading.replace(/{#[\w-]+}\s*$/, '')));
    }

    return slugs;
};

/**
 * Every tail one of THESE pages answers to, mapped back to its actual path — the same suffix idea
 * as {@link trackedTargets}, so an anchor lookup can go straight from a claim's spelling to the
 * page whose headings settle it.
 */
const anchorPageFor = (pages: string[]): Map<string, string> => {
    const byTail = new Map<string, string>();

    for (const page of pages) {
        const segments = page.split('/');
        for (let index = 0; index < segments.length; index += 1)
            byTail.set(segments.slice(index).join('/'), page);
    }

    return byTail;
};

/**
 * Whether an allowlist entry covers this token — what is under an entry, and any directory on the
 * way to one, since a page naming `reports` and a page naming `reports/mutation/` make the same
 * claim about the same run output.
 */
const allowed = (token: string): boolean =>
    ALLOWED.some(
        ({ prefix }) =>
            token === prefix.replace(/\/$/, '') ||
            token.startsWith(prefix) ||
            prefix.startsWith(`${token}/`)
    );

/**
 * `tsconfig.app.json`'s path aliases, as `@/` → `src/`, read rather than transcribed — a second
 * copy of this table is exactly the kind of fact that goes stale silently.
 *
 * Comments are stripped before parsing: the config is JSONC, and `JSON.parse` refuses them.
 */
const readAliases = (): { prefix: string; target: string }[] => {
    const raw = readFileSync(path.join(ROOT, TSCONFIG), 'utf8').replaceAll(/^\s*\/\/.*$/gm, '');
    const paths = (JSON.parse(raw) as { compilerOptions?: { paths?: Record<string, string[]> } })
        .compilerOptions?.paths;

    return Object.entries(paths ?? {}).map(([alias, [target]]) => ({
        prefix: alias.replace(/\*$/, ''),
        target: target.replace(/^\.\//, '').replace(/\*$/, '')
    }));
};

/**
 * `process.env` with git's own hook-time exports stripped, for a nested `git` call that must
 * resolve against its `cwd` rather than whichever repo invoked the hook.
 *
 * A git hook (this repo's `pre-commit` included) exports `GIT_DIR`/`GIT_WORK_TREE`/
 * `GIT_INDEX_FILE` for its own children. `execFileSync` inherits `process.env` by default, so a
 * nested `git ls-files` aimed at the peer repo — or even this repo's own subdirectory — silently
 * answers for the hook's repo instead. https://git-scm.com/docs/githooks#_environment
 */
const gitEnvironmentWithoutHookVariables = (): NodeJS.ProcessEnv => {
    const environment = { ...process.env };
    delete environment.GIT_DIR;
    delete environment.GIT_WORK_TREE;
    delete environment.GIT_INDEX_FILE;
    return environment;
};

/**
 * Every tail of every path git tracks, plus every directory on the way to one and ITS tails.
 *
 * Precomputed rather than matched with `endsWith` per token: the sweep asks over a thousand
 * questions against the whole tree across a dozen candidate spellings each, and a set lookup
 * turns that from millions of string comparisons into one hash per question.
 */
const trackedTargets = (root: string): { targets: Set<string>; roots: Set<string> } => {
    const files = execFileSync('git', ['ls-files'], {
        cwd: root,
        encoding: 'utf8',
        env: gitEnvironmentWithoutHookVariables()
    })
        .split('\n')
        .filter(Boolean);
    const targets = new Set<string>();
    // What actually sits at the root, taken from the file list rather than from `targets` — that
    // set holds every TAIL, so `products/create.vue` would make `products` look top-level.
    const roots = new Set(files.map((file) => file.split('/')[0]));

    const addTails = (candidate: string) => {
        const segments = candidate.split('/');
        for (let index = 0; index < segments.length; index += 1)
            targets.add(segments.slice(index).join('/'));
    };

    for (const file of files) {
        addTails(file);
        // Directories are claims too — `src/modules/` names no file and must still resolve.
        const segments = file.split('/');
        for (let index = 1; index < segments.length; index += 1)
            addTails(segments.slice(0, index).join('/'));
    }

    return { targets, roots };
};

/**
 * How a page may spell a path it means. Docs cite TypeScript module specifiers as often as files
 * — `@api` resolves to `contracts/rest/index` — so an extensionless token is checked against what
 * it would import.
 */
const SPELLINGS = [
    '',
    '.ts',
    '.tsx',
    '.js',
    '.vue',
    '.json',
    '.yaml',
    '.yml',
    '.md',
    '/index.ts',
    '/index.js',
    '/index.vue'
];

/**
 * Normalize one inline code span into the path it claims (with any `#anchor` kept, separately),
 * or `undefined` when it claims none.
 *
 * Trailing `:42` / `:functionName` is a locator within a file, not part of it, and a trailing
 * slash is a directory's punctuation. The `#anchor`, unlike those two, is itself a claim — a page
 * this repo can check once the target is a page it tracks — so it survives to {@link tokenOf}.
 */
const toPath = (span: string): { path: string; anchor?: string } | undefined => {
    if (NOT_A_PATH.test(span)) return undefined;
    if (/^(https?|mailto):/.test(span)) return undefined;
    // VitePress resolves these against the page, and `docs:build` already fails on a dead one.
    if (span.startsWith('./') || span.startsWith('../')) return undefined;
    // A route, not a file.
    if (span.startsWith('/')) return undefined;

    const [beforeAnchor, anchor] = span.split('#');
    const path = beforeAnchor
        .split(':')[0]
        .replaceAll(/[,.;]+$/g, '')
        .replaceAll(/\/+$/g, '');
    if (!path || path.startsWith('-') || path.startsWith('$')) return undefined;

    return { path, anchor };
};

/**
 * Rewrite a `@alias/…` token to the path it actually names, or drop it when no alias claims it —
 * an unclaimed `@scope/name` is an npm package, and this repo's tree says nothing about it.
 */
const throughAliases = (
    aliases: { prefix: string; target: string }[],
    token: string
): string | undefined => {
    if (!token.startsWith('@')) return token;

    // A wildcard alias (`@/*`) keeps its trailing slash and matches a prefix; a bare one
    // (`@types`) must match whole, or `@api` would claim `@api-platform/core`.
    const alias = aliases.find((entry) =>
        entry.prefix.endsWith('/') ? token.startsWith(entry.prefix) : token === entry.prefix
    );
    if (!alias) return undefined;

    return alias.target + token.slice(alias.prefix.length);
};

/**
 * Whether this token is claiming a path in THIS repo at all — it ends in a real filename, or its
 * first segment is something that actually sits at the root. The second half is read from the
 * tree rather than listed, so a new top-level directory needs no edit here.
 */
const claimsAPath = (roots: Set<string>, token: string): boolean =>
    // Anchored on the LAST segment, so `.visual.cy.ts` — a suffix convention, not a file — is not
    // read as one because a filename happens to sit inside it.
    FILENAME.test(token.split('/').at(-1) ?? '') || roots.has(token.split('/')[0]);

/** Whether any spelling of this token is the tail of something git tracks. */
const resolves = (targets: Set<string>, token: string): boolean =>
    SPELLINGS.some((suffix) => targets.has(token + suffix));

/** What one page's inline code spans resolve to: the paths it claims, filtered to the real ones. */
interface Scan {
    tokens: string[];
    findings: string[];
}

/** One code span's path claim, and any `#anchor` locator riding along with it. */
interface Claim {
    path: string;
    anchor?: string;
}

/** One code span reduced to the repo path (and anchor) it claims, or nothing when it claims none. */
const tokenOf = (
    span: string,
    aliases: { prefix: string; target: string }[],
    roots: Set<string>
): Claim | undefined => {
    const claimed = toPath(span);
    if (!claimed) return undefined;

    const path = throughAliases(aliases, claimed.path);
    if (!path || !claimsAPath(roots, path) || allowed(path)) return undefined;

    return { path, anchor: claimed.anchor };
};

/**
 * Whether the file a claim names exists, and — when it names an anchor too — whether that page
 * actually carries a heading answering to it. A citation of the paired repo resolves over THERE,
 * by its DIRECTORY name; the anchor half only ever applies to a page (`.md`) in THIS repo, since
 * that is the only tree a heading can be read out of here.
 */
const isReal = (
    claim: Claim,
    own: Set<string>,
    peer: Set<string> | undefined,
    anchorsOf: (ownPath: string) => Set<string> | undefined
): boolean => {
    if (claim.path.startsWith(`${PEER_DIRECTORY}/`))
        // No peer checkout (a bare clone, a worktree): the cross-repo half is skipped, not failed.
        return !peer || resolves(peer, claim.path.slice(PEER_DIRECTORY.length + 1));

    if (!resolves(own, claim.path)) return false;
    if (!claim.anchor) return true;

    const slugs = anchorsOf(claim.path);
    // Not a page this repo tracks the heading text of (a non-`.md` file, or one `resolves` only
    // matched by a spelling other than a bare `.md` file) — the anchor claim goes unchecked, the
    // same way a peer-repo path already does above.
    return !slugs || slugs.has(claim.anchor);
};

/** Everything a page claims and everything it gets wrong — one page, so the caller stays flat. */
const scanPage = (
    markdown: string,
    context: {
        aliases: { prefix: string; target: string }[];
        roots: Set<string>;
        own: Set<string>;
        peer: Set<string> | undefined;
        anchorsOf: (ownPath: string) => Set<string> | undefined;
    }
): Scan => {
    const scan: Scan = { tokens: [], findings: [] };

    // Line by line, so the opt-out marker can scope to the one claim that needs it rather than to
    // a whole page.
    for (const line of markdown.split('\n')) {
        if (line.includes(IGNORE_LINE)) continue;

        for (const [, span] of line.matchAll(/`([^`]+)`/g)) {
            const claim = tokenOf(span, context.aliases, context.roots);
            if (!claim) continue;

            scan.tokens.push(claim.path);
            if (!isReal(claim, context.own, context.peer, context.anchorsOf))
                scan.findings.push(claim.anchor ? `${claim.path}#${claim.anchor}` : claim.path);
        }
    }

    return scan;
};

/** The page that must name every script `package.json` defines. */
const SCRIPTS_PAGE = 'docs/tools/package-scripts.md';

/** The page that must name every runtime dependency, and only installed ones. */
const DEPENDENCIES_PAGE = 'docs/tools/package-dependencies.md';

/**
 * Scripts the docs tell a reader to run in the PAIRED BACKEND, so they are not in this repo's
 * `package.json`. Named, not read from the peer: a script cited here that is neither this repo's
 * nor on this list is a finding, and the peer's own scripts (some of which share a name with a
 * script this repo REMOVED) must not be able to excuse it.
 */
const BACKEND_SCRIPTS: readonly string[] = ['host', 'sync:frontend', 'demo'];

/**
 * A `package.json`'s script and dependency names.
 *
 * @returns The scripts, dependencies and dev dependencies of this repo.
 */
const readPackage = (): {
    scripts: string[];
    dependencies: string[];
    devDependencies: string[];
} => {
    // Every `package.json` in this repo declares all three maps.
    const json = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as Record<
        'scripts' | 'dependencies' | 'devDependencies',
        Record<string, unknown>
    >;
    return {
        scripts: Object.keys(json.scripts),
        dependencies: Object.keys(json.dependencies),
        devDependencies: Object.keys(json.devDependencies)
    };
};

/**
 * What the docs claim about `package.json` and the generated contract, checked — see
 * `document-facts.ts`.
 *
 * @param pages - Every tracked docs page, read.
 * @returns Every claim that does not hold.
 */
const factFindings = (pages: DocumentPage[]): FactFinding[] => {
    const own = readPackage();
    const contractIndex = readFileSync(path.join(ROOT, 'contracts/rest/index.ts'), 'utf8');
    const contractSchemas = readFileSync(path.join(ROOT, 'contracts/rest/schemas.zod.ts'), 'utf8');
    const byPath = new Map(pages.map((page) => [page.path, page]));
    const scriptsPage = byPath.get(SCRIPTS_PAGE);
    const dependenciesPage = byPath.get(DEPENDENCIES_PAGE);

    return [
        ...missingScripts(pages, new Set([...own.scripts, ...BACKEND_SCRIPTS])),
        ...(scriptsPage ? unnamedOn(scriptsPage, own.scripts, 'script') : []),
        ...(dependenciesPage
            ? [
                  ...unnamedOn(dependenciesPage, own.dependencies, 'dependency'),
                  ...staleListings(
                      dependenciesPage,
                      new Set([...own.dependencies, ...own.devDependencies])
                  )
              ]
            : []),
        ...unknownContractImports(pages, {
            '@api': exportedNames(contractIndex),
            '@api/schemas': exportedNames(contractSchemas)
        })
    ];
};

const run = (): number => {
    const aliases = readAliases();
    const own = trackedTargets(ROOT);
    /* The tracked roots, plus the generated ones git never sees. */
    const roots = new Set([...own.roots, ...ALLOWED.map((entry) => entry.prefix.split('/')[0])]);

    const peerRoot = resolveBackendPath();
    // Absent in a bare checkout or a worktree; the cross-repo half is skipped rather than fatal.
    const peerTargets = existsSync(path.join(peerRoot, '.git'))
        ? trackedTargets(peerRoot).targets
        : undefined;

    const pages = execFileSync('git', ['ls-files', 'docs'], {
        cwd: ROOT,
        encoding: 'utf8',
        env: gitEnvironmentWithoutHookVariables()
    })
        .split('\n')
        .filter((file) => file.endsWith('.md'));

    const anchorPages = anchorPageFor(pages);
    // One read per cited page, not per citation — a heavily-linked page would otherwise reparse
    // its own headings dozens of times over one sweep.
    const slugsCache = new Map<string, Set<string>>();
    const anchorsOf = (ownPath: string): Set<string> | undefined => {
        const page = anchorPages.get(ownPath) ?? anchorPages.get(`${ownPath}.md`);
        if (!page) return undefined;

        if (!slugsCache.has(page))
            slugsCache.set(page, headingSlugs(readFileSync(path.join(ROOT, page), 'utf8')));
        return slugsCache.get(page);
    };

    const findings: Finding[] = [];
    let references = 0;
    const documentPages = pages.map((page) => ({
        path: page,
        text: readFileSync(path.join(ROOT, page), 'utf8')
    }));

    const context = { aliases, roots, own: own.targets, peer: peerTargets, anchorsOf };

    for (const page of pages) {
        const scan = scanPage(readFileSync(path.join(ROOT, page), 'utf8'), context);

        references += scan.tokens.length;
        for (const token of scan.findings) findings.push({ page, token });
    }

    const facts = factFindings(documentPages);

    if (pages.length < MIN_PAGES || references < MIN_REFERENCES) {
        console.error(
            `[docs-references] Swept ${pages.length} pages and ${references} references — below ` +
                `the floor of ${MIN_PAGES}/${MIN_REFERENCES}.\n` +
                '               A sweep reading nothing reports a clean tree forever. Fix the ' +
                'sweep, do not lower the floor.'
        );
        return 1;
    }

    if (findings.length === 0 && facts.length === 0) {
        console.log(
            `[docs-references] ${pages.length} pages, ${references} references, all resolved.`
        );
        return 0;
    }

    if (facts.length > 0) {
        console.error(
            `[docs-references] ${facts.length} claims about scripts, dependencies or the contract that do not hold:\n`
        );
        for (const { page, problem } of facts) console.error(`  ${page}: ${problem}`);
        console.error('');
        if (findings.length === 0) return 1;
    }

    console.error(
        `[docs-references] ${pages.length} pages, ${references} references, ` +
            `${findings.length} matching no file:\n`
    );
    let current = '';
    for (const { page, token } of findings) {
        if (page !== current) {
            console.error(`  ${page}`);
            current = page;
        }
        console.error(`      ${token}`);
    }
    console.error('\n               Correct the claim, or add it to ALLOWED with a reason.');

    return 1;
};

process.exitCode = run();
