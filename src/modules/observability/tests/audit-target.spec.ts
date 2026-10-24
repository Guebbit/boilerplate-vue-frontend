/**
 * @module
 * `auditTargetLocation` — which audit targets link to a page: the types with a detail route, in a
 * build that ships the route, and nothing else.
 */
import { describe, expect, it } from 'vitest';
import { auditTargetLocation, shortTargetId } from '../composables/audit-target.ts';

/** A router that knows exactly the route names it is given. */
const routerWith = (...names: string[]) => ({ hasRoute: (name: string) => names.includes(name) });

describe('auditTargetLocation', () => {
    it.each([
        ['order', 'OrderTarget'],
        ['user', 'UserTarget'],
        ['product', 'ProductTarget'],
        ['webhook_subscription', 'WebhookTarget']
    ])('links a %s to %s with its id', (targetType, name) => {
        expect(auditTargetLocation(routerWith(name), targetType, 'abc')).toEqual({
            name,
            params: { id: 'abc' }
        });
    });

    it('has nowhere to go for a type without a page', () => {
        expect(auditTargetLocation(routerWith('OrderTarget'), 'api_key', 'k1')).toBeUndefined();
    });

    it('has nowhere to go when this build ships no such route', () => {
        expect(auditTargetLocation(routerWith(), 'order', 'o1')).toBeUndefined();
    });

    it('has nowhere to go for a row without a target', () => {
        expect(auditTargetLocation(routerWith('OrderTarget'))).toBeUndefined();
        expect(auditTargetLocation(routerWith('OrderTarget'), 'order')).toBeUndefined();
    });
});

describe('shortTargetId', () => {
    it('keeps the first eight characters', () => {
        expect(shortTargetId('6adc83737c230dfde46df72f')).toBe('6adc8373');
        expect(shortTargetId('es')).toBe('es');
    });
});
