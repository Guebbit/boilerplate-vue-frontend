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
 *   2. An entry whose counterpart is not simply the same name must give a reason. Eleven of
 *      fourteen pair one-to-one and need no prose; the interesting three are `admin` (one screen
 *      over two backend domains), `realtime` (consumes a stream `observability` serves) and
 *      `demo` (no backend domain at all). Those are exactly the facts that are invisible from
 *      either repo alone.
 *   3. No entry names a module that is not enabled, so a deleted domain takes its row with it.
 *
 * Stated rather than derived, deliberately: a name matcher would call `admin` unpaired, which is
 * the wrong answer rather than a missing one.
 *
 * ── Where this came from ─────────────────────────────────────────────────────────────────────
 * This table used to live in `scripts/module-docs/pairing.ts`, rendering the "two repositories"
 * section of the modules overview and enforcing these rules as a side effect. The generator is
 * gone; the rules had nothing to do with documentation, so they moved here.
 *
 * See: docs/modules/index.md
 */

import { describe, expect, it } from 'vitest';
import { enabledModules } from '@/modules';

/** One module's counterpart in `boilerplate-node-backend`. */
interface Pairing {
    /** Backend module names that serve this domain. Empty means none does. */
    counterparts: readonly string[];

    /** Required when the names differ or the list is empty. One sentence, present tense. */
    why?: string;
}

const BACKEND_PAIRING: Readonly<Partial<Record<string, Pairing>>> = {
    account: { counterparts: ['account'] },
    admin: {
        counterparts: ['observability', 'audit-logs'],
        why: 'The dashboard is one screen over two backend domains: `observability` serves health and the metrics overview, `audit-logs` owns the trail behind its audit table.'
    },
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
    wishlist: { counterparts: ['wishlist'] }
};

/** Whether an entry pairs one-to-one with a backend module of the same name. */
const isSameName = (name: string, pairing: Pairing): boolean =>
    pairing.counterparts.length === 1 && pairing.counterparts[0] === name;

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

    /** The guard on the guard: an empty registry would satisfy all three rules above. */
    it('is checking the modules it is meant to be checking', () => {
        expect(enabledModules.length).toBeGreaterThanOrEqual(10);
    });
});
