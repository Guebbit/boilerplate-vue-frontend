/**
 * Which module in the paired backend answers each module here — and, where none does, why.
 *
 * This is the only place in this repo that names a domain on the other side, and the gap it
 * guards is the one that widens most quietly: nothing in a frontend build fails when the backend
 * renames a module, splits one in two, or grows a domain this client never learns about. The
 * two module maps drift apart over months, and the first person to notice is whoever is trying to
 * find out where a feature actually lives.
 *
 * Three rules, and the second is the one that does the work:
 *
 *   1. Every enabled module has an entry. A new domain here cannot be merged without someone
 *      saying what answers it.
 *   2. An entry whose counterpart is not simply the same name must give a reason. Twelve of
 *      sixteen pair one-to-one and need no prose; the interesting four are `account` (the address
 *      book lives here, not in its own module), `admin` (one screen over two backend domains),
 *      `realtime` (consumes a stream `observability` serves) and `demo` (no backend domain at
 *      all). Those are exactly the facts that are invisible from either repo alone.
 *   3. No entry names a module that is not enabled, so a deleted domain takes its row with it.
 *
 * Stated rather than derived, deliberately: a name matcher would call `admin` unpaired, which is
 * the wrong answer rather than a missing one.
 *
 * ── Why the table lives in a spec ────────────────────────────────────────────────────────────
 * These are rules, not documentation, so they live with the rules and fail a test run when they
 * break. The modules overview describes the same pairing in prose, for a reader; this file is
 * what makes it true.
 *
 * See: docs/modules/index.md
 */

import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { enabledModules } from '@/modules';
import { resolveBackendPath } from '../../scripts/pairing/paired-backend-path';

/** One module's counterpart in `boilerplate-node-backend`. */
interface Pairing {
    /** Backend module names that serve this domain. Empty means none does. */
    counterparts: readonly string[];

    /** Required when the names differ or the list is empty. One sentence, present tense. */
    why?: string;
}

const BACKEND_PAIRING: Readonly<Partial<Record<string, Pairing>>> = {
    account: {
        counterparts: ['account', 'addresses'],
        why: 'The address book lives inside this module as `AddressPicker`, not its own — the backend keeps it a separate domain.'
    },
    admin: {
        counterparts: ['observability', 'audit-logs'],
        why: 'The dashboard is one screen over two backend domains: `observability` serves health and the metrics overview, `audit-logs` owns the trail behind its audit table.'
    },
    'api-keys': { counterparts: ['api-keys'] },
    cart: { counterparts: ['cart'] },
    delivery: { counterparts: ['delivery'] },
    demo: {
        counterparts: [],
        why: 'A client-side showcase of the shared UI kit. It pairs with the demo profile and the seeded dataset rather than with any backend domain.'
    },
    feedback: { counterparts: ['feedback'] },
    inventory: { counterparts: ['inventory'] },
    locales: { counterparts: ['locales'] },
    orders: { counterparts: ['orders'] },
    payments: { counterparts: ['payments'] },
    products: { counterparts: ['products'] },
    realtime: {
        counterparts: ['observability'],
        why: 'It consumes `GET /observability/events`, the SSE stream that module serves. There is no backend `realtime` module because the stream is one route on a dashboard, not a domain.'
    },
    users: { counterparts: ['users'] },
    webhooks: { counterparts: ['webhooks'] },
    wishlist: { counterparts: ['wishlist'] }
};

/** Whether an entry pairs one-to-one with a backend module of the same name. */
const isSameName = (name: string, pairing: Pairing): boolean =>
    pairing.counterparts.length === 1 && pairing.counterparts[0] === name;

/**
 * FA128: every name `BACKEND_PAIRING` claims as a counterpart, checked against the backend's OWN
 * module list — closing the gap the rest of this file always had: everything above only checks
 * this table against ITSELF, so a counterpart renamed or removed on the other side never made a
 * red test here, only a person noticing by hand.
 *
 * Read from the backend's `src/modules.ts`, specifically its `ModuleName` union — that file's own
 * docstring calls it "hand-listed", i.e. the one place the backend enumerates its module names as
 * literal strings rather than as `AppModule[]` values a cross-repo static read cannot import
 * (`@kernel/registry` is that repo's own path alias, unresolvable from here).
 */
const BACKEND_MODULES_FILE = path.join(resolveBackendPath(), 'src', 'modules.ts');

/**
 * The backend's real module names, or `undefined` when there is no sibling checkout to read —
 * exactly `check-spec-identity.ts`'s own leniency: this spec runs in `npm run test:unit`, which
 * `ci.yml`'s `test-unit` job runs WITHOUT checking out the backend, so treating an absent sibling
 * as "skip this one check" rather than "fail" is what keeps the gate meaningful for both.
 *
 * @param file - the backend's `src/modules.ts`, {@link BACKEND_MODULES_FILE} unless a test points
 *  elsewhere
 * @returns every literal in the `ModuleName` union, or `undefined` if the file cannot be read or
 *  no longer declares that union in a form this can parse
 */
const readBackendModuleNames = (file = BACKEND_MODULES_FILE): string[] | undefined => {
    if (!existsSync(file)) return undefined;
    const source = readFileSync(file, 'utf8');
    const union = /export type ModuleName =\s*([\S\s]*?);/.exec(source);
    if (!union) return undefined;
    return [...union[1].matchAll(/'([\w-]+)'/g)].map(([, name]) => name);
};

const backendModuleNames = readBackendModuleNames();

describe('the cross-repository pairing', () => {
    it('names a counterpart for every enabled module', () => {
        const missing = enabledModules
            .filter(({ name }) => !BACKEND_PAIRING[name])
            .map(
                ({ name }) =>
                    `Module "${name}" has no entry in BACKEND_PAIRING. Name its backend counterpart, or state why it has none.`
            );

        expect(missing).toEqual([]);
    });

    it('gives a reason wherever the pairing is not one-to-one by name', () => {
        const unexplained = enabledModules
            .flatMap(({ name }) => {
                const pairing = BACKEND_PAIRING[name];
                if (!pairing || isSameName(name, pairing) || pairing.why) return [];
                const answers =
                    pairing.counterparts.length > 0 ? pairing.counterparts.join(' + ') : 'nothing';
                return [
                    `Module "${name}" pairs with ${answers} in the backend and gives no reason. Add \`why\` to its entry.`
                ];
            })
            .toSorted();

        expect(unexplained).toEqual([]);
    });

    it('names no module that is not enabled', () => {
        const names = new Set(enabledModules.map(({ name }) => name));
        const stale = Object.keys(BACKEND_PAIRING)
            .filter((name) => !names.has(name))
            .map((name) => `BACKEND_PAIRING names "${name}", which is not an enabled module.`);

        expect(stale).toEqual([]);
    });

    /**
     * The guard on the guard: an empty registry would satisfy all three rules above. A floor of 1
     * rather than this demo's module count — deleting a domain must not also delete the canary.
     */
    it('is checking the modules it is meant to be checking', () => {
        expect(enabledModules.length).toBeGreaterThanOrEqual(1);
    });

    /**
     * FA128 — the check the rest of this file never made: does the backend actually have what
     * `BACKEND_PAIRING` says it does. Skipped, not failed, when there is no sibling checkout to
     * read (see {@link readBackendModuleNames}); real names only, so `demo`'s empty list and
     * nothing else passes it vacuously.
     */
    it.skipIf(backendModuleNames === undefined)(
        "names only backend modules that actually exist in the sibling's own registry",
        () => {
            const known = new Set(backendModuleNames);
            const ghosts = Object.entries(BACKEND_PAIRING).flatMap(([name, pairing]) =>
                (pairing?.counterparts ?? [])
                    .filter((counterpart) => !known.has(counterpart))
                    .map(
                        (counterpart) =>
                            `"${name}" names backend counterpart "${counterpart}", which is not in ${BACKEND_MODULES_FILE}'s ModuleName union.`
                    )
            );

            expect(ghosts).toEqual([]);
        }
    );

    /** The guard on the guard for the check above: a sibling read that silently found nothing. */
    it.skipIf(backendModuleNames === undefined)(
        'read a real, non-empty module list from the sibling checkout',
        () => {
            expect(backendModuleNames?.length).toBeGreaterThan(0);
        }
    );
});

describe('readBackendModuleNames — independent of whether a sibling checkout is present', () => {
    /** Scratch files made by a case, removed after it. */
    const scratch: string[] = [];

    afterEach(() => {
        for (const directory of scratch.splice(0))
            rmSync(directory, { recursive: true, force: true });
    });

    /** A `src/modules.ts`-shaped fixture at a fresh temp path, holding `contents`. */
    const fixture = (contents: string): string => {
        const directory = mkdtempSync(path.join(tmpdir(), 'backend-modules-'));
        scratch.push(directory);
        const file = path.join(directory, 'modules.ts');
        writeFileSync(file, contents);
        return file;
    };

    it('reads every literal out of the ModuleName union', () => {
        const file = fixture(
            "export type ModuleName =\n    | 'cart'\n    | 'orders'\n    | 'wishlist';\n"
        );

        expect(readBackendModuleNames(file)).toEqual(['cart', 'orders', 'wishlist']);
    });

    it('is undefined for a file with no ModuleName union to read', () => {
        expect(readBackendModuleNames(fixture('export const nothing = 1;\n'))).toBeUndefined();
    });

    it('is undefined for a path with nothing at it', () => {
        expect(
            readBackendModuleNames(path.join(tmpdir(), 'does-not-exist-modules.ts'))
        ).toBeUndefined();
    });
});
