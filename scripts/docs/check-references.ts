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
    { prefix: 'reports/', reason: 'written by a test/mutation run, absent until one happens' },
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
 * Whether an allowlist entry covers this token — the directory itself as well as what is under
 * it, since a page naming `reports` and a page naming `reports/mutation/` make the same claim.
 */
const allowed = (token: string): boolean =>
    ALLOWED.some(({ prefix }) => token === prefix.replace(/\/$/, '') || token.startsWith(prefix));

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
 * Every tail of every path git tracks, plus every directory on the way to one and ITS tails.
 *
 * Precomputed rather than matched with `endsWith` per token: the sweep asks over a thousand
 * questions against the whole tree across a dozen candidate spellings each, and a set lookup
 * turns that from millions of string comparisons into one hash per question.
 */
const trackedTargets = (root: string): { targets: Set<string>; roots: Set<string> } => {
    const files = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
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
 * Normalize one inline code span into the path it claims, or `undefined` when it claims none.
 *
 * Trailing `:42` / `:functionName` and `#anchor` are locators within a file, not part of it, and
 * a trailing slash is a directory's punctuation.
 */
const toPath = (span: string): string | undefined => {
    if (NOT_A_PATH.test(span)) return undefined;
    if (/^(https?|mailto):/.test(span)) return undefined;
    // VitePress resolves these against the page, and `docs:build` already fails on a dead one.
    if (span.startsWith('./') || span.startsWith('../')) return undefined;
    // A route, not a file.
    if (span.startsWith('/')) return undefined;

    const token = span
        .split('#')[0]
        .split(':')[0]
        .replaceAll(/[,.;]+$/g, '')
        .replaceAll(/\/+$/g, '');
    if (!token || token.startsWith('-') || token.startsWith('$')) return undefined;

    return token;
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

/** One code span reduced to the repo path it claims, or nothing when it claims none. */
const tokenOf = (
    span: string,
    aliases: { prefix: string; target: string }[],
    roots: Set<string>
): string | undefined => {
    const claimed = toPath(span);
    if (!claimed) return undefined;

    const token = throughAliases(aliases, claimed);
    if (!token || !claimsAPath(roots, token) || allowed(token)) return undefined;

    return token;
};

/**
 * Whether the file a token names exists. A citation of the paired repo resolves over THERE, by its
 * DIRECTORY name — the one thing that catches a page addressing it by its package name instead.
 */
const isReal = (token: string, own: Set<string>, peer: Set<string> | undefined): boolean => {
    if (!token.startsWith(`${PEER_DIRECTORY}/`)) return resolves(own, token);

    // No peer checkout (a bare clone, a worktree): the cross-repo half is skipped, not failed.
    return !peer || resolves(peer, token.slice(PEER_DIRECTORY.length + 1));
};

/** Everything a page claims and everything it gets wrong — one page, so the caller stays flat. */
const scanPage = (
    markdown: string,
    context: {
        aliases: { prefix: string; target: string }[];
        roots: Set<string>;
        own: Set<string>;
        peer: Set<string> | undefined;
    }
): Scan => {
    const scan: Scan = { tokens: [], findings: [] };

    // Line by line, so the opt-out marker can scope to the one claim that needs it rather than to
    // a whole page.
    for (const line of markdown.split('\n')) {
        if (line.includes(IGNORE_LINE)) continue;

        for (const [, span] of line.matchAll(/`([^`]+)`/g)) {
            const token = tokenOf(span, context.aliases, context.roots);
            if (!token) continue;

            scan.tokens.push(token);
            if (!isReal(token, context.own, context.peer)) scan.findings.push(token);
        }
    }

    return scan;
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

    const pages = execFileSync('git', ['ls-files', 'docs'], { cwd: ROOT, encoding: 'utf8' })
        .split('\n')
        .filter((file) => file.endsWith('.md'));

    const findings: Finding[] = [];
    let references = 0;

    const context = { aliases, roots, own: own.targets, peer: peerTargets };

    for (const page of pages) {
        const scan = scanPage(readFileSync(path.join(ROOT, page), 'utf8'), context);

        references += scan.tokens.length;
        for (const token of scan.findings) findings.push({ page, token });
    }

    if (pages.length < MIN_PAGES || references < MIN_REFERENCES) {
        console.error(
            `[docs-references] Swept ${pages.length} pages and ${references} references — below ` +
                `the floor of ${MIN_PAGES}/${MIN_REFERENCES}.\n` +
                '               A sweep reading nothing reports a clean tree forever. Fix the ' +
                'sweep, do not lower the floor.'
        );
        return 1;
    }

    if (findings.length === 0) {
        console.log(
            `[docs-references] ${pages.length} pages, ${references} references, all resolved.`
        );
        return 0;
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
