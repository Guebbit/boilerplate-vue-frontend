/**
 * `scripts/contracts/shared-rules/*` — the frontend's rules registry: every YAML under
 * `shared/rules/` obeys its schema, and the browser-storage merge refuses each way the backend's
 * cookie list and the frontend's display order can disagree.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { buildBrowserStorage } from '../../../../scripts/contracts/shared-rules/browser-storage';
import {
    SHARED_RULES,
    browserStorageSchema,
    syncedCookiesSchema
} from '../../../../scripts/contracts/shared-rules/rules';
import type { LoadRules } from '../../../../scripts/contracts/shared-rules/rules';

/** Parses a repo file with a schema, as `generate-shared-rules.ts` does. */
const load: LoadRules = (relative, schema) => schema.parse(parse(readFileSync(relative, 'utf8')));

describe('the registry', () => {
    it.each(Object.entries(SHARED_RULES))('%s: the committed YAML obeys its schema', (_n, rule) => {
        expect(() => load(rule.source, rule.schema)).not.toThrow();
    });

    it('lists the four rules, so an emptied registry cannot pass', () => {
        expect(Object.keys(SHARED_RULES).toSorted()).toEqual([
            'browser-storage',
            'notification-screens',
            'static-pages',
            'tours'
        ]);
    });

    it('writes each rule to a distinct generated file', () => {
        const outs = Object.values(SHARED_RULES).map(({ generate }) => generate.out);

        expect(new Set(outs).size).toBe(outs.length);
    });
});

/** One backend cookie row. */
const cookie = (name: string) => ({
    name,
    setter: 'backend' as const,
    kind: 'cookie' as const,
    necessity: 'necessary' as const
});
/** One frontend row. */
const stored = (name: string) => ({
    name,
    setter: 'frontend' as const,
    kind: 'localStorage' as const,
    necessity: 'necessary' as const
});
describe('buildBrowserStorage', () => {
    const synced = { cookies: { session: cookie('__Host-session') } };
    const own = { order: ['session', 'cart'], items: { cart: stored('cart') } };

    it('merges both sources in the declared order', () => {
        const { items, names } = buildBrowserStorage(own, synced);

        expect(items.map(({ id }) => id)).toEqual(['session', 'cart']);
        expect(names).toEqual({ session: '__Host-session', cart: 'cart' });
    });

    it('fails when the backend adds a cookie the order has no place for', () => {
        const grown = { cookies: { ...synced.cookies, extra: cookie('extra') } };

        expect(() => buildBrowserStorage(own, grown)).toThrow(/no place for extra/);
    });

    it('fails when the order lists an id nothing defines', () => {
        expect(() =>
            buildBrowserStorage({ ...own, order: [...own.order, 'ghost'] }, synced)
        ).toThrow(/ghost, which has no row/);
    });

    it('fails when the order lists an id twice', () => {
        expect(() =>
            buildBrowserStorage({ ...own, order: [...own.order, 'cart'] }, synced)
        ).toThrow(/cart twice/);
    });

    it('fails when an own row reuses a backend id', () => {
        const clash = { ...own, items: { ...own.items, session: stored('other') } };

        expect(() => buildBrowserStorage(clash, synced)).toThrow(
            /session is also a backend cookie/
        );
    });

    it('fails when two rows share a stored name', () => {
        const twin = { ...own, items: { cart: stored('__Host-session') } };

        expect(() => buildBrowserStorage(twin, synced)).toThrow(/share a stored name/);
    });
});

describe('the real inventory', () => {
    const backend = load('contracts/cookies.yaml', syncedCookiesSchema);
    const frontend = load('shared/rules/browser-storage.yaml', browserStorageSchema);

    it('places every backend cookie, and there is at least one', () => {
        const ids = Object.keys(backend.cookies);

        expect(ids.length).toBeGreaterThan(0);
        expect(frontend.order).toEqual(expect.arrayContaining(ids));
    });

    it('builds without a refusal', () => {
        expect(() => buildBrowserStorage(frontend, backend)).not.toThrow();
    });
});
