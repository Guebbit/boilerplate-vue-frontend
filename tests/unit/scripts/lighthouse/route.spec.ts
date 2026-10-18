/**
 * `scripts/lighthouse/route.ts`: `{subject:x}` placeholders in a case's route.
 */
import { describe, it, expect } from 'vitest';
import { resolveRoute } from '../../../../scripts/lighthouse/route';

describe('resolveRoute', () => {
    it('fills a subject placeholder with the published id', () => {
        expect(resolveRoute('/en/products/{subject:product.rich}', { 'product.rich': '42' })).toBe(
            '/en/products/42'
        );
    });

    it('leaves a route without placeholders alone', () => {
        expect(resolveRoute('/en/cart', {})).toBe('/en/cart');
    });

    it('names the subjects the backend does publish when one is missing', () => {
        expect(() => resolveRoute('/x/{subject:nope}', { 'order.paid': '7' })).toThrow(
            /"nope".*published: order\.paid/
        );
    });
});
