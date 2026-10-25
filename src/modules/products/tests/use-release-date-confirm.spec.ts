/**
 * @module
 * The product form's release-date check: it asks the server how many buyers a changed date would
 * email, and only an unchanged date (or a visitor who cannot read orders) skips the question.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useSessionStore } from '@/infrastructure/session.ts';
import { useDialogStore } from '@/ui/dialog.ts';
import { useReleaseDateConfirm } from '../composables/use-release-date-confirm.ts';

const { previewRelease } = vi.hoisted(() => ({ previewRelease: vi.fn() }));

vi.mock('@api', () => ({
    previewReleaseDateImpact: previewRelease,
    previewRestockDateImpact: vi.fn()
}));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));

/** The date the product holds, and a different one typed into the input. */
const HELD = new Date(2027, 2, 15, 9, 30).toISOString();
const EARLIER = '2027-03-01T10:00';

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.spyOn(useSessionStore(), 'can').mockReturnValue(true);
});

describe('confirmReleaseDateMove', () => {
    it('asks the server for any changed date, an earlier one too', () => {
        previewRelease.mockResolvedValue({ data: { notify: 0 } });
        const { confirmReleaseDateMove } = useReleaseDateConfirm(() => HELD);

        return confirmReleaseDateMove('p1', EARLIER).then((go) => {
            expect(previewRelease).toHaveBeenCalledOnce();
            expect(go).toBe(true);
        });
    });

    it('does not ask when the date was left alone', () => {
        const { confirmReleaseDateMove } = useReleaseDateConfirm(() => HELD);

        return confirmReleaseDateMove('p1', '2027-03-15T09:30').then((go) => {
            expect(previewRelease).not.toHaveBeenCalled();
            expect(go).toBe(true);
        });
    });

    it('puts the server count to the visitor when buyers would be emailed', () => {
        previewRelease.mockResolvedValue({ data: { notify: 3 } });
        const confirm = vi.spyOn(useDialogStore(), 'confirm').mockResolvedValue(false);
        const { confirmReleaseDateMove } = useReleaseDateConfirm(() => HELD);

        return confirmReleaseDateMove('p1', '').then((go) => {
            expect(confirm).toHaveBeenCalledOnce();
            expect(go).toBe(false);
        });
    });

    it('goes on with the save when the preview fails', () => {
        previewRelease.mockRejectedValue(new Error('offline'));
        const { confirmReleaseDateMove } = useReleaseDateConfirm(() => HELD);

        return confirmReleaseDateMove('p1', EARLIER).then((go) => {
            expect(go).toBe(true);
        });
    });
});
