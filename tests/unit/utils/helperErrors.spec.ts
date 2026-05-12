import { describe, expect, it } from 'vitest';
import { getErrorMessages } from '@/utils/helperErrors.ts';

describe('getErrorMessages', () => {
    it('maps 401 errors to authentication state messaging', () => {
        const messages = getErrorMessages({
            success: false,
            status: 401,
            message: 'Unauthorized',
            errors: []
        });

        expect(messages).toEqual(['Authentication required']);
    });

    it('maps 403 errors to authorization state messaging', () => {
        const messages = getErrorMessages({
            success: false,
            status: 403,
            message: 'Forbidden',
            errors: []
        });

        expect(messages).toEqual(['Forbidden']);
    });
});
