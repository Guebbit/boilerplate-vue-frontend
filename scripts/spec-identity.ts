/**
 * The cross-repo contract check.
 *
 * A set of files exists in BOTH this repo and the paired backend, identical. Codegen on both sides
 * reads the specs among them, so a one-line edit in one checkout silently forks what both sides
 * believe they share — and neither CI notices, because a forked spec is still a valid spec.
 *
 * The backend mirrors this file; only `THIS_REPO` differs there, so a file added on one side is a
 * one-line copy on the other. This repo is the one exception to "mirror": it is the side that
 * pairs with EITHER backend (`.env`'s `BACKEND_PATH` says which), so it is also the one side that
 * cannot assume a single backend layout — see `SharedFile.backend` and `fingerprint` below, neither
 * of which the backend's own copy of this file needs.
 *
 * See: docs/reference/contracts.md#keeping-the-pair-in-step
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

/** Which of the paired repos a checkout is. */
export type RepoRole = 'backend' | 'frontend';

/**
 * One shared file, named on both sides.
 *
 * `backend` is a list rather than one path for the one entry whose location the two paired
 * backends do not agree on — everything else, a single string is enough.
 */
export interface SharedFile {
    backend: string | readonly string[];
    frontend: string;
}

/** Which side this checkout is. The one value that differs from the backend's copy. */
export const THIS_REPO: RepoRole = 'frontend';

/** The other side, whichever this one is. */
export const siblingRole = (role: RepoRole): RepoRole =>
    role === 'backend' ? 'frontend' : 'backend';

/**
 * The files that must be identical in both checkouts.
 *
 * The test is not "are these the same today" — a dozen more files happen to match, from favicons
 * to `.prettierrc` — but "does a fork cause a silent bug". Everything here fails quietly: the two
 * sides keep building, keep passing their own suites, and disagree only in production or in a
 * live-API run.
 *
 * EVERY ENTRY IS PRODUCED IN THE BACKEND and copied here, which is what makes a fork answerable:
 * this repo's copy is an OUTPUT, so "which side is right" has one answer, and `sync:frontend`
 * applies it. Editing the copy is the failure this list is worst at describing and best at
 * catching — the next regeneration reverts it, and the diff looks like the backend broke
 * something. `asyncapi.public.yaml` is the one whose name differs on arrival: it lands as this
 * repo's `asyncapi.yaml`, because the shared subset is the whole of the async contract as far as
 * this repo is concerned.
 *
 * That is the whole membership rule. Files the two repos keep identical FOR CONVENIENCE are out —
 * `spectral.yaml` and the shared scripts (`check-mutation-baseline.ts`, `report-test-results.ts`,
 * `generate-asyncapi-types.ts`), hand-maintained on both sides, so a fork is a question no script
 * can answer and the gate could only report it. Nothing breaks silently when two repos lint under
 * rulesets that have drifted apart, or when one holds a newer test reporter — and, now that a
 * second backend can be the paired one, those scripts have no PHP equivalent to compare against at
 * all. This list matches the Node backend's rather than re-deriving it, because the two drifting is
 * exactly the failure mode this file exists to prevent.
 *
 * Also deliberately absent, for the same reason: `public/favicon/*`, `.prettierrc`,
 * `.dockerignore`, `.husky/*`, `.docker/nginx.docs.conf` and `docs/.vitepress/theme/*`. Identical
 * by convention, and a gate that fails on an icon trains people to ignore it.
 *
 * Nothing this repo can REGENERATE from a file already here belongs here either. Such a copy
 * carries no fact the list does not already compare, and every entry costs a manual step per
 * contract change. The generated realtime types and the API client collections are out for that
 * reason; each is guarded by a freshness check inside its own repo.
 */
export const SHARED_FILES: readonly SharedFile[] = [
    /* The contract itself. */
    { backend: 'openapi.yaml', frontend: 'openapi.yaml' },
    /*
     * The async contract, in its SHARED half only. Either backend's `asyncapi.yaml` holds every
     * channel that service has, internal queues included; `asyncapi.public.yaml` is the same
     * document minus the sections no API client can reach, and it is that subset this repo
     * receives as its own `asyncapi.yaml`.
     */
    { backend: 'asyncapi.public.yaml', frontend: 'asyncapi.yaml' },
    /*
     * The analytics event names THIS app emits — the only analytics file crossing the boundary.
     * One Umami namespace, one emitter per name; a backend's own names are never published because
     * its controllers import them directly.
     *
     * The one entry with two backend candidates: the Node twin publishes it under its own
     * `src/infrastructure/observability/` layout, the PHP twin under `shared/contracts/` — each
     * repo's own lint config decided the location, and this list has to be able to find either one
     * without being told in advance which backend is paired.
     */
    {
        backend: [
            'src/infrastructure/observability/analytics-events.frontend.ts',
            'shared/contracts/analytics-events.ts'
        ],
        frontend: 'src/infrastructure/observability/analytics-events.ts'
    }
] as const;

export type SpecComparisonStatus = 'match' | 'drift' | 'missing-here' | 'missing-there';

export interface SpecComparison {
    /** This repo's path for the file — what a reader of the failure message has to go open. */
    file: string;
    /** The sibling's path — whichever candidate was actually found, or the first when none was. */
    siblingFile: string;
    /** Identity fingerprint of this repo's copy, or undefined when the file is absent here. */
    ours?: string;
    /** Identity fingerprint of the sibling's copy, or undefined when the file is absent there. */
    theirs?: string;
    status: SpecComparisonStatus;
}

/**
 * sha256 rather than md5: nothing here is adversarial, but a checksum printed in a failure
 * message gets pasted into issues and commit messages, and a deprecated digest in that position
 * invites the question every time.
 */
export const hashFile = (filePath: string): string =>
    createHash('sha256').update(readFileSync(filePath)).digest('hex');

/**
 * The same data with every MAP sorted by key and every LIST left alone — mirrors the backend's own
 * `SharedContract::normalise()` exactly, for the reasons written there:
 *
 * - Map key order is ignored. Two bundlers listing an operation's responses in a different order
 *   describe one API.
 * - Sequence order is not. `security`, `enum` and a path's `parameters` all mean something by
 *   their position, so a blanket sort would call two different documents identical.
 * - A trailing newline is ignored, a trailing space is not. The first is a block scalar's
 *   chomping indicator (`|` vs `|-`), decided by the dumper; the second is content.
 */
const normalise = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map((entry) => normalise(entry));

    if (value !== null && typeof value === 'object') {
        const sorted: Record<string, unknown> = {};
        for (const key of Object.keys(value).toSorted()) {
            sorted[key] = normalise(value[key as keyof typeof value]);
        }
        return sorted;
    }

    return typeof value === 'string' ? value.replace(/\n+$/, '') : value;
};

/**
 * A digest of a file's IDENTITY rather than its bytes, for `.yaml`/`.yml`.
 *
 * Either paired backend can be the one deployed, and only one of them bundles byte-stably: the
 * Node twin's redocly output is deterministic, the PHP twin's `symfony/yaml` quotes what redocly
 * leaves bare and reflows a bearer-auth array across two lines. A raw byte hash would report a
 * real sync from the PHP twin as forked on formatting alone — parse first, then hash the parsed
 * and re-serialised form, so two documents that mean the same thing fingerprint the same and a
 * real content change still doesn't.
 *
 * Everything else is hashed as raw bytes, unchanged: `.ts` files are a bundler's string template,
 * not a serialised document, and neither twin has shown byte instability in one.
 */
export const fingerprint = (filePath: string): string => {
    if (path.extname(filePath) !== '.yaml' && path.extname(filePath) !== '.yml') {
        return hashFile(filePath);
    }

    const parsed = normalise(parseYaml(readFileSync(filePath, 'utf8')));
    return createHash('sha256').update(JSON.stringify(parsed)).digest('hex');
};

/** Every candidate path for one side of a shared-file entry, in order. */
const candidates = (root: string, entry: string | readonly string[]): string[] =>
    (Array.isArray(entry) ? entry : [entry]).map((entryPath) => path.join(root, entryPath));

/**
 * Compare every shared file against a sibling checkout.
 *
 * Never throws on a missing file: an absent file is reported as its own status, so the caller can
 * tell "the sibling checkout is not where I looked" (everything `missing-there`) from "someone
 * deleted openapi.yaml" (one entry). Those want different messages, and a thrown ENOENT gives
 * neither.
 *
 * @param siblingRoot - absolute path to the other repo's checkout
 * @param here - absolute path to this repo's root; defaults to the working directory
 * @param role - which side `here` is; defaults to this repo's own role
 */
export const compareSharedFiles = (
    siblingRoot: string,
    here: string = process.cwd(),
    role: RepoRole = THIS_REPO
): SpecComparison[] =>
    SHARED_FILES.map((shared) => {
        // This checkout always has exactly one path for its own side — a candidate list only
        // ever appears on the OTHER side, the one this checkout does not control.
        const ownEntry = shared[role];
        const file = Array.isArray(ownEntry) ? ownEntry[0] : ownEntry;
        const ourPath = path.join(here, file);

        const siblingEntry = shared[siblingRole(role)];
        const siblingPaths = candidates(siblingRoot, siblingEntry);
        const theirPath = siblingPaths.find((candidatePath) => existsSync(candidatePath));
        const siblingFile = theirPath
            ? path.relative(siblingRoot, theirPath)
            : Array.isArray(siblingEntry)
              ? siblingEntry[0]
              : siblingEntry;

        if (!existsSync(ourPath)) return { file, siblingFile, status: 'missing-here' as const };
        if (theirPath === undefined) {
            return {
                file,
                siblingFile,
                ours: fingerprint(ourPath),
                status: 'missing-there' as const
            };
        }

        const ours = fingerprint(ourPath);
        const theirs = fingerprint(theirPath);
        return {
            file,
            siblingFile,
            ours,
            theirs,
            status: ours === theirs ? ('match' as const) : ('drift' as const)
        };
    });

/** Every comparison that is not a clean match — i.e. everything worth printing. */
export const sharedFileProblems = (comparisons: SpecComparison[]): SpecComparison[] =>
    comparisons.filter(({ status }) => status !== 'match');

/** How a pair is named in a message: one path, or both when they differ between the repos. */
const describe = ({ file, siblingFile }: SpecComparison): string =>
    file === siblingFile ? file : `${file} ↔ ${siblingFile}`;

/**
 * Render the problems as the message a human needs: which file, which side, and what to do.
 * Returns an empty string when there is nothing wrong, so callers can branch on truthiness.
 */
export const formatSharedFileProblems = (
    comparisons: SpecComparison[],
    siblingRoot: string
): string => {
    const problems = sharedFileProblems(comparisons);
    if (problems.length === 0) return '';

    const lines = problems.map((problem) => {
        switch (problem.status) {
            case 'drift': {
                return (
                    `  ${describe(problem)}: FORKED\n` +
                    `    here    ${problem.ours}\n` +
                    `    sibling ${problem.theirs}`
                );
            }
            case 'missing-here': {
                return `  ${problem.file}: absent from this repo, present in the sibling`;
            }
            default: {
                return `  ${problem.siblingFile}: absent from ${siblingRoot}`;
            }
        }
    });

    return (
        `Shared contract mismatch against ${siblingRoot}:\n${lines.join('\n')}\n\n` +
        `  Both repos carry identical copies of ${SHARED_FILES.length} files, and EVERY ONE is\n` +
        `  produced in the backend from per-module sources — so this never needs a decision about\n` +
        `  which copy is right. This repo's is an output. Rebuild it and hand it over:\n` +
        `    cd <backend> && npm run contracts:bundle   # or: php artisan contracts:bundle\n` +
        `    cd <backend> && npm run sync:frontend       # or: composer sync:frontend\n` +
        `  Then regenerate this repo's OWN outputs, which are not shared and not copied:\n` +
        `    npm run gen:api && npm run gen:asyncapi`
    );
};
