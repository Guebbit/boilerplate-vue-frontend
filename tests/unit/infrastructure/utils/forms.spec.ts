import { describe, expect, it } from 'vitest';
import { emptyToNull, omitNulls } from '@/infrastructure/utils/forms.ts';

describe('emptyToNull', () => {
    it('turns an emptied field into null', () => {
        expect(emptyToNull('')).toBeNull();
    });

    it('leaves a non-empty value untouched', () => {
        expect(emptyToNull('a label')).toBe('a label');
    });

    it('passes an unset optional field straight through', () => {
        expect(emptyToNull(undefined)).toBeUndefined();
    });
});

describe('omitNulls', () => {
    it('keeps a non-null value among the given keys', () => {
        expect(omitNulls({ weight: 100, imageUrl: 'x', other: 1 }, ['weight', 'imageUrl'])).toEqual(
            { weight: 100, imageUrl: 'x' }
        );
    });

    it('drops a null value among the given keys', () => {
        expect(omitNulls({ weight: null, imageUrl: 'x' }, ['weight', 'imageUrl'])).toEqual({
            imageUrl: 'x'
        });
    });

    it('ignores a key outside the given list, null or not', () => {
        expect(omitNulls({ weight: 100, other: null }, ['weight'])).toEqual({ weight: 100 });
    });
});
