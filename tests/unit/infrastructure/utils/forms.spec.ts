import { describe, expect, it } from 'vitest';
import { emptyToNull } from '@/infrastructure/utils/forms.ts';

describe('emptyToNull', () => {
    it('turns an emptied field into null', () => {
        expect(emptyToNull('')).toBeNull();
    });

    it('leaves a non-empty value untouched', () => {
        expect(emptyToNull('a label')).toBe('a label');
    });
});
