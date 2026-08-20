/**
 * Which module in the paired backend answers each module here — and, where none does, why.
 *
 * Eleven of fourteen domains exist on both sides under the same name. The other three are the
 * interesting ones: `admin` renders two backend modules, `realtime` consumes a stream one of them
 * serves, and `demo` has no backend domain at all.
 *
 * Stated rather than derived: a name matcher would call `admin` unpaired, which is the wrong
 * answer. `npm run check:module-docs` fails when an enabled module is missing an entry, so the gap
 * cannot widen quietly.
 *
 * See: docs/modules/index.md#the-two-repositories
 */

/** One module's counterpart in `boilerplate-node-backend`. */
interface Pairing {
    /** Backend module names that serve this domain. Empty means none does. */
    counterparts: readonly string[];

    /** Required when the names differ or the list is empty. One sentence, present tense. */
    why?: string;
}

export const BACKEND_PAIRING: Readonly<Partial<Record<string, Pairing>>> = {
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

/** Backend modules with no counterpart here, and why. */
export const BACKEND_ONLY: Readonly<Record<string, string>> = {};
