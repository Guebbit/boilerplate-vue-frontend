/**
 * The demo dataset, as the backend's API actually answers it.
 *
 * `dataset.json` beside this file is byte-identical to `db/seeds/dataset.json` in the paired
 * backend, and `check:spec-identity` proves it. It is produced there by `npm run seed:export`,
 * which seeds a throwaway Mongo with the real seeders and reads every row back through the real
 * serializers — so what is in it is what `GET /products` and friends return, defaults and derived
 * totals included.
 *
 * ## What this file is for
 *
 * Two things the published rows cannot carry on their own, kept in ONE place instead of repeated
 * across five module fixture builders.
 *
 * ## Why the shared file used to be facts, and why that was not enough
 *
 * The old `seed-identities.ts` shared plain FACTS — ids, titles, prices — and each repo wrote its
 * own mapper from those facts into the shape it needed. Identical facts could not keep the two
 * MAPPERS honest, and they drifted exactly where you would expect: `mocks/seeds.ts` here carried a
 * hand-written `active: true` and `verified: true`, copied from a reading of the backend's schema
 * defaults, and no `locale` at all because nobody remembered the column existed. Every spec on both
 * sides passed, each consistent with its own copy.
 *
 * There is one mapper now and it is the API's. What is left here is the two honest divergences.
 *
 * ## Nothing here is cast to a contract type
 *
 * Every builder below declares its return type — `Product[]`, `User[]`, `Order[]` — and TypeScript
 * checks the JSON's own inferred shape against it. That is the point of the annotations: they are
 * not documentation, they are the assertion. Rename a field in `openapi.yaml`, regenerate, and this
 * file stops compiling; blanket-casting the rows to `Product[]` would have made the same rename
 * silent, which is the failure mode the whole dataset rewrite exists to close.
 *
 * `status` is the single exception, and narrowly: a JSON import widens every string literal to
 * `string`, so a string enum has to be narrowed back to the type the contract already declares.
 */

import type { CartItem, Order, OrderStatus, Product, User, WishlistItem } from '@types';
import dataset from './dataset.json';

/** The credentials `cy.loginAs()` types into a real login form. */
export const seedCredentials = dataset.credentials;

/**
 * DIVERGENCE 1 — `imageUrl` is dropped everywhere.
 *
 * The paths in the dataset (`/images/seed/*.jpg`) are served by the BACKEND out of its own
 * `public/`. This repo ships no such files, so under MSW every one of them would resolve to a 404
 * and every seeded avatar and product image would render broken. `test:e2e:live` gets the real URLs
 * from the real API, which is the only mode where they mean anything.
 *
 * The key is kept and set to `undefined` rather than deleted: the generated types declare it
 * optional, and a spec asserting "no image" reads better against a present-but-empty field than
 * against a missing one.
 */
const withoutImage = <T extends { imageUrl?: string }>(record: T): T => ({
    ...record,
    imageUrl: undefined
});

/**
 * DIVERGENCE 2 — the timestamps are restamped to now.
 *
 * The dataset's `createdAt` is pinned in the past (read off each record's ObjectId), which is what
 * makes the published file byte-stable. A mock database wants "recently created" instead: relative
 * date rendering, "new this week" style filters and freshness assertions all read the clock, and a
 * fixture permanently dated February 2024 makes them assert the wrong thing.
 *
 * Applied only where a spec would notice — the top-level records. An order's embedded product
 * SNAPSHOT keeps the catalogue's real dates, because a snapshot is the product as it was.
 */
const now = () => new Date().toISOString();

const restamped = <T extends { createdAt?: string; updatedAt?: string }>(record: T): T => ({
    ...record,
    createdAt: now(),
    updatedAt: now()
});

/*
 * Every accessor below is a FUNCTION, never a shared constant.
 *
 * Handlers mutate what the database holds — `splice`, `unshift`, index assignment — so each reset
 * needs its own objects. Returning a second reference to the same mutated array would make one
 * spec's writes visible to the next, in the order the runner happened to pick.
 */

/** The catalogue, as `GET /products` serves it. */
export const buildSeedProducts = (): Product[] =>
    dataset.collections.products.map((product) => restamped(withoutImage({ ...product })));

/** The demo accounts, as `GET /users` serves them. */
export const buildSeedUsers = (): User[] =>
    dataset.collections.users.map((user) => restamped(withoutImage({ ...user })));

/**
 * The order history, totals included.
 *
 * `totalItems`, `totalQuantity` and `totalPrice` come straight from the file: the backend's
 * `applyOrderTransform` derived them, so there is nothing left for `computeOrderTotals` to
 * recompute and disagree about. That helper still exists for orders a spec CREATES at runtime,
 * where there is no published row to read.
 */
export const buildSeedOrders = (): Order[] =>
    dataset.collections.orders.map((order) => ({
        ...restamped({ ...order }),
        /*
         * The one field the JSON's inferred type is looser about than the contract. `status` is a
         * string enum in `openapi.yaml`, and a JSON import widens every string literal to `string`
         * — so this narrows it back to what the contract already declared, rather than the whole
         * row being cast to `Order` and the other twelve fields going unchecked with it.
         */
        status: order.status as OrderStatus,
        items: order.items.map((item) => ({
            ...item,
            product: withoutImage({ ...item.product })
        }))
    }));

/**
 * The active session's cart.
 *
 * `mockDatabase.sampleCartItems` models ONE browser's cart rather than one per user, so this takes
 * the lines of the single seeded cart instead of merging every user's. The backend seeds a cart
 * only for the admin — the ordinary customer's empty cart is itself the fixture for "someone who
 * has never added anything".
 */
export const buildSeedCartItems = (): CartItem[] =>
    (dataset.collections.carts[0]?.items ?? []).map((item) => ({ ...item }));

/**
 * The active session's wishlist.
 *
 * The DEMO user's, because that is who `cy.loginAs('user')` signs in as — so the mock and a live
 * run answer the same saved products to the same login.
 */
export const buildSeedWishlistItems = (): WishlistItem[] => {
    const demoUser = dataset.collections.users.find((user) => !user.admin);
    const wishlist = dataset.collections.wishlists.find(({ userId }) => userId === demoUser?.id);
    return (wishlist?.items ?? []).map((item) => ({ ...item }));
};
