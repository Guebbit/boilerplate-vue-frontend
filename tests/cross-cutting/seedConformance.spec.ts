/**
 * Does the demo dataset still match the contract it is supposed to be a specimen of?
 *
 * MIRROR of `tests/cross-cutting/seed-conformance.test.ts` in the paired backend. Same assertions,
 * different import paths — `tests/support/mocks/demo-data.json` is byte-identical to
 * `db/demo/demo-data.json` over there, so a check living in only one repo would let the other's copy
 * rot until the next `check:spec-identity`. That job compares the two copies to each other; nothing
 * compared either of them to `openapi.yaml`.
 *
 * WHICH DIRECTION OF DRIFT THIS CATCHES. Renaming a field in `openapi.yaml` without the backend's
 * seeders following is silent from here: the mock database keeps serving the old shape, every
 * handler keeps agreeing with it, and nothing compares either to the contract this repo generates
 * its client from. That is the gap this file closes, and it is the direction a contract-first
 * project actually drifts in.
 *
 * WHAT CHANGED WHEN THE DATASET STARTED BEING EXPORTED. This used to parse `seed-identities.ts`, a
 * file of hand-written FACTS, which meant every schema here needed surgery before it could be used:
 * the user schema was `.extend()`ed with a `password` and a `cart` the API never returns, and the
 * order schema was `.pick()`ed down to four fields because a fixture had no business stating a
 * total or a status.
 *
 * `demo-data.json` holds what the API actually answered, so the schemas are used AS GENERATED. The
 * totals and the status are in there now — derived by `applyOrderTransform`, and therefore worth
 * checking, where a seeded guess at them would only have tested the guess.
 *
 * `.strict()` is what makes these catch a RENAME in both directions. Orval emits a plain
 * `zod.object()` even though `openapi.yaml` says `additionalProperties: false`, and almost every
 * property is optional because a client must tolerate a sparse server. Parsed as generated, a row
 * still carrying `imageUrl` after the contract renamed it to `image` would pass twice over: the
 * stale key is STRIPPED as unknown, and the new one is absent-but-optional. `.strict()` fails on
 * the stale key; the `.required()` masks fail on the missing one.
 */

import { describe, expect, it } from 'vitest';
import {
    CreateUserBody,
    GetCartResponse,
    GetOrderByIdResponse,
    GetProductByIdResponse,
    GetUserByIdResponse,
    GetWishlistResponse
} from '@api/schemas';
import dataset from '@mocks/demo-data.json';

const { _meta, credentials, collections } = dataset;

/*
 * The `.required()` masks are where "a seeded record is a complete specimen" stops being a comment.
 * The wire type is permissive on purpose; every seeded row promises these fields, and both repos
 * read them with no `?? fallback`. `deletedAt` stays optional throughout: it is present on exactly
 * one product and one order, by design.
 */
const productSchema = GetProductByIdResponse.shape.data
    .required({
        onHand: true,
        reserved: true,
        available: true,
        description: true,
        active: true,
        imageUrl: true,
        categories: true,
        tags: true
    })
    .strict();

const userSchema = GetUserByIdResponse.shape.data
    .required({ admin: true, active: true, imageUrl: true })
    .strict();

const orderSchema = GetOrderByIdResponse.shape.data.strict();

/** `{ productId, quantity }` — one line of a stored cart. */
const cartItemSchema = GetCartResponse.shape.data.shape.items.element.strict();

const wishlistProductIdSchema = GetWishlistResponse.shape.data.shape.items.element.shape.productId;

const idSchema = GetUserByIdResponse.shape.data.shape.id;

describe('the exported dataset conforms to the generated contract', () => {
    describe('products', () => {
        it('parse against the generated product schema', () => {
            expect(collections.products.length).toBeGreaterThan(0);
            for (const product of collections.products) {
                expect(() => productSchema.parse(product)).not.toThrow();
            }
        });

        it('carry exactly one soft-deleted and one inactive specimen', () => {
            /* Both branches of `publicScope()` need a fixture behind them, and a branch with no
             * fixture is a branch nothing exercises. */
            expect(collections.products.filter((product) => 'deletedAt' in product)).toHaveLength(
                1
            );
            expect(collections.products.filter((product) => !product.active)).toHaveLength(1);
        });
    });

    describe('users', () => {
        it('parse against the generated user schema', () => {
            expect(collections.users.length).toBeGreaterThan(0);
            for (const user of collections.users) {
                expect(() => userSchema.parse(user)).not.toThrow();
            }
        });

        it('never publish a password or a token', () => {
            /* the backend's `applyUserTransform` omits both and its schema marks them
             * `select: false`. This is the assertion that would fail if the export ever started
             * reading rows some other way — and the one that would catch a credential reaching a
             * file this repo publishes to the browser. */
            for (const user of collections.users) {
                expect(user).not.toHaveProperty('password');
                expect(user).not.toHaveProperty('tokens');
            }
        });

        it('include one admin and one ordinary account', () => {
            expect(collections.users.filter((user) => user.admin)).toHaveLength(1);
            expect(collections.users.filter((user) => !user.admin)).toHaveLength(1);
        });
    });

    describe('credentials', () => {
        it('would be accepted by the real signup policy', () => {
            /* `CreateUserBody.shape.password` IS the policy — a published credential the API would
             * reject is a demo nobody can re-register by hand, and the frontend's `cy.loginAs()`
             * types these into a real login form. */
            for (const account of Object.values(credentials)) {
                expect(() => CreateUserBody.shape.password.parse(account.password)).not.toThrow();
            }
        });

        it('name accounts the dataset actually contains', () => {
            const emails = new Set(collections.users.map((user) => user.email));
            for (const account of Object.values(credentials)) {
                expect(emails).toContain(account.email);
            }
        });
    });

    describe('orders', () => {
        it('parse against the generated order schema, totals included', () => {
            expect(collections.orders.length).toBeGreaterThan(0);
            for (const order of collections.orders) {
                expect(() => orderSchema.parse(order)).not.toThrow();
            }
        });

        it('carry the totals the serializer derived rather than stored values', () => {
            /* Recomputed here from the lines, which is the one place restating the arithmetic is
             * the point: if the backend's `applyOrderTransform` ever stops agreeing with its own
             * inputs, the published dataset would carry the disagreement straight into this repo's
             * mocks — which is precisely what `computeOrderTotals` used to do on its own. */
            for (const order of collections.orders) {
                const quantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
                const price = order.items.reduce(
                    (sum, item) => sum + item.product.price * item.quantity,
                    0
                );
                expect(order.totalItems).toBe(order.items.length);
                expect(order.totalQuantity).toBe(quantity);
                expect(order.totalPrice).toBe(price);
            }
        });

        it('include one soft-deleted order, owned by the NON-admin account', () => {
            /* The case this exercises is "the owner cannot see their own soft-deleted order", which
             * ownership-only scoping would wrongly allow and an admin-owned fixture could not
             * catch. */
            const deleted = collections.orders.filter((order) => 'deletedAt' in order);
            expect(deleted).toHaveLength(1);

            const admin = collections.users.find((user) => user.admin);
            expect(deleted[0].userId).not.toBe(admin?.id);
        });
    });

    describe('carts', () => {
        it('parse their lines against the generated cart item schema', () => {
            const items = collections.carts.flatMap((cart) => cart.items);
            expect(items.length).toBeGreaterThan(0);
            for (const item of items) {
                expect(() => cartItemSchema.parse(item)).not.toThrow();
            }
        });
    });

    describe('wishlists', () => {
        it('parse their owner and their saved products against the generated id scalars', () => {
            expect(collections.wishlists.length).toBeGreaterThan(0);
            for (const wishlist of collections.wishlists) {
                expect(() => idSchema.parse(wishlist.userId)).not.toThrow();
                for (const item of wishlist.items) {
                    expect(() => wishlistProductIdSchema.parse(item.productId)).not.toThrow();
                }
            }
        });

        it('save only products the storefront would actually show', () => {
            /* A saved line pointing at the soft-deleted or inactive fixture renders as a hole in the
             * wishlist page: the row resolves to a product the scoping rules then refuse. */
            const visible = new Set(
                collections.products
                    .filter((product) => product.active && !('deletedAt' in product))
                    .map((product) => product.id)
            );
            for (const wishlist of collections.wishlists) {
                for (const item of wishlist.items) {
                    expect(visible).toContain(item.productId);
                }
            }
        });
    });

    /**
     * `_meta.shapes` — what a handler in this repo is allowed to do with each collection.
     *
     * This is the half of the mirror that matters most here: a mock author reads the artefact and
     * nothing else of the backend, and `stored` is the label that stops a handler returning a row
     * the API never serves that way. `addressBooks` is the worked example — `GET /account/addresses`
     * answers `{ addresses: [...] }`, built from the book's `items`.
     *
     * The backend's export refuses to publish an unclassified collection; these cases hold the
     * copy that landed here to the same rule, between syncs.
     */
    describe('the shapes map', () => {
        it('names every published collection, and only those', () => {
            expect(Object.keys(_meta.shapes).toSorted()).toStrictEqual(
                Object.keys(collections).toSorted()
            );
        });

        it('classifies each one as either servable or not', () => {
            /* A JSON import widens the values to `string`, so nothing has checked the union the
             * backend's manifest declares. A third value would be a handler reading a label it has
             * no branch for. */
            for (const shape of Object.values(_meta.shapes)) {
                expect(['response', 'stored']).toContain(shape);
            }
        });

        it('calls a collection servable exactly when this file parses it as a whole response', () => {
            /* The tripwire on a mislabel, which is the failure the map introduces: a wrong label is
             * worse than none, because the reader stops checking. Only these three parse against a
             * whole `Get<X>ByIdResponse` payload above — the rest are checked through an element or
             * a nested field, which is itself the evidence that no endpoint serves the row. */
            const parsedAsWholeResponses = ['orders', 'products', 'users'];

            const servable = Object.entries(_meta.shapes)
                .filter(([, shape]) => shape === 'response')
                .map(([name]) => name);

            expect(servable.toSorted()).toStrictEqual(parsedAsWholeResponses);
        });
    });
});
