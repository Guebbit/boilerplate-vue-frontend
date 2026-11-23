/**
 * The shop factory builds a shop the generated schema accepts, with no override.
 */
import { describe, expect, it } from 'vitest';
import { aShop } from './shop-fixtures.ts';

describe('aShop', () => {
    it('builds a default shop without an override', () => {
        expect(aShop().currency).toBeTruthy();
    });
});
