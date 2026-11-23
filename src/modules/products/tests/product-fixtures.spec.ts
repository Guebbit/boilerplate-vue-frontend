/**
 * The product factory proves what it builds against the generated schema, and hands back the
 * object the test wrote, not Zod's parse of it.
 */
import { describe, expect, it } from 'vitest';
import { aProduct } from './product-fixtures.ts';

describe('aProduct', () => {
    it('hands back what the test wrote, with no schema default filled in', () => {
        expect(Object.keys(aProduct())).not.toContain('requiresShipping');
    });
});
