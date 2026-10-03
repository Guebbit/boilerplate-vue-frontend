/**
 * `linkIfRouted` — `src/kernel/route-link.ts` — the general form of `signInLocation`'s own
 * guard, for route names with no `MODULE_EDGES` coupling to back them.
 */
import { describe, expect, it } from 'vitest';
import { linkIfRouted } from '@/kernel/route-link';

/** A router stub that resolves only the given route names. */
const routerWith = (names: string[]) => ({ hasRoute: (name: string) => names.includes(name) });

describe('linkIfRouted', () => {
    it('returns undefined when this build ships no such route', () => {
        expect(linkIfRouted(routerWith([]), 'OrderTarget', { id: 'o1' })).toBeUndefined();
    });

    it('returns a plain named location when the route resolves', () => {
        expect(linkIfRouted(routerWith(['OrderTarget']), 'OrderTarget', { id: 'o1' })).toEqual({
            name: 'OrderTarget',
            params: { id: 'o1' }
        });
    });

    it('omits params entirely when none are given', () => {
        expect(linkIfRouted(routerWith(['ProductsList']), 'ProductsList')).toEqual({
            name: 'ProductsList'
        });
    });

    it('carries a query alongside, or instead of, params — AuditLog’s own shape', () => {
        expect(
            linkIfRouted(routerWith(['AuditLog']), 'AuditLog', undefined, { target: 'o1' })
        ).toEqual({
            name: 'AuditLog',
            query: { target: 'o1' }
        });
    });
});
