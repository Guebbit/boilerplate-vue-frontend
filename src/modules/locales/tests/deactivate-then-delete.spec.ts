import { describe, expect, it, vi } from 'vitest';
import { deactivateThenDelete } from '@/modules/locales/domain/deactivate-then-delete.ts';

/**
 * `deactivateThenDelete`: an active row deactivates first (the API's guard rail against deleting
 * one), and a delete failure AFTER that must not leave the row silently deactivated — nothing
 * the visitor asked for, and nothing else would undo it.
 */
describe('deactivateThenDelete', () => {
    it('deletes an already-inactive row without touching activation at all', () => {
        const deactivate = vi.fn(() => Promise.resolve());
        const remove = vi.fn(() => Promise.resolve());
        const reactivate = vi.fn(() => Promise.resolve());

        return deactivateThenDelete(false, deactivate, remove, reactivate).then(() => {
            expect(deactivate).not.toHaveBeenCalled();
            expect(remove).toHaveBeenCalled();
            expect(reactivate).not.toHaveBeenCalled();
        });
    });

    it('deactivates an active row before deleting it', () => {
        const order: string[] = [];
        const deactivate = vi.fn(() => {
            order.push('deactivate');
            return Promise.resolve();
        });
        const remove = vi.fn(() => {
            order.push('remove');
            return Promise.resolve();
        });

        return deactivateThenDelete(true, deactivate, remove, vi.fn()).then(() => {
            expect(order).toEqual(['deactivate', 'remove']);
        });
    });

    /**
     * The regression: a delete failing after a successful deactivation used to leave the row
     * deactivated, with the error as the only trace of what happened.
     */
    it('reactivates a row whose delete failed after it was deactivated', () => {
        const deleteError = new Error('delete failed');
        const reactivate = vi.fn(() => Promise.resolve());

        return expect(
            deactivateThenDelete(
                true,
                () => Promise.resolve(),
                () => Promise.reject(deleteError),
                reactivate
            )
        )
            .rejects.toBe(deleteError)
            .then(() => {
                expect(reactivate).toHaveBeenCalled();
            });
    });

    it('never tries to reactivate a row that was never deactivated in the first place', () => {
        const reactivate = vi.fn(() => Promise.resolve());

        return expect(
            deactivateThenDelete(
                false,
                vi.fn(),
                () => Promise.reject(new Error('delete failed')),
                reactivate
            )
        )
            .rejects.toThrow('delete failed')
            .then(() => {
                expect(reactivate).not.toHaveBeenCalled();
            });
    });

    it('reports the original delete error even when the reactivate itself also fails', () => {
        const deleteError = new Error('delete failed');

        return expect(
            deactivateThenDelete(
                true,
                () => Promise.resolve(),
                () => Promise.reject(deleteError),
                () => Promise.reject(new Error('reactivate failed too'))
            )
        ).rejects.toBe(deleteError);
    });
});
