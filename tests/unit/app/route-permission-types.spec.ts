/**
 * `RoutePermission` and `can()` refuse a pair no declared rule carries, at compile time.
 * The assertions live in the `@ts-expect-error` lines: `vue-tsc` fails when one stops erroring.
 */
import { describe, expect, it } from 'vitest';
import type { RoutePermission } from '@/app/guards/authentications';

describe('RoutePermission', () => {
    it('accepts a declared pair and refuses an undeclared one', () => {
        const declared: RoutePermission = ['display', 'Order'];
        // @ts-expect-error -- `checkout` is not an action any rule carries on `Order`
        const wrongAction: RoutePermission = ['checkout', 'Order'];
        // @ts-expect-error -- `Ordr` is not a declared subject
        const wrongSubject: RoutePermission = ['read', 'Ordr'];

        expect([declared, wrongAction, wrongSubject]).toHaveLength(3);
    });
});
