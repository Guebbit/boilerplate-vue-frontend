/**
 * @module
 * The product form's check before a later or cleared release date is saved: it asks the backend
 * how many orders the move would notify or ask (`GET /delivery/fulfillment-orders/release-date-impact`)
 * and puts the answer in a confirm dialog. It informs and never refuses.
 *
 * Calls `previewReleaseDateImpact` from `@api` directly, as `use-active-locales.ts` does for the
 * locales: `delivery` is a sibling module, and the generated client is infrastructure.
 */
import { useI18n } from 'vue-i18n';
import { previewReleaseDateImpact } from '@api';
import { useSessionStore } from '@/infrastructure/session.ts';
import { formatDate } from '@/infrastructure/utils/formatters.ts';
import { useDialogStore } from '@/ui/dialog.ts';
import { fromDateTimeLocal, isReleaseDateSlip } from '../domain';

/**
 * What the preview counts, as the dialog reads it.
 */
interface ReleaseDateImpact {
    /**
     * Orders that get a notice only.
     */
    notify: number;
    /**
     * Orders that get a question; silence cancels and refunds.
     */
    ask: number;
    /**
     * When silence would cancel, were the question asked now.
     */
    answerBy: string;
}

/**
 * The confirm step of the release-date save.
 *
 * @param heldDate - Reads the release date the product holds now (the loaded record's).
 * @returns `confirmReleaseDateMove`, resolving whether to go on and save.
 */
export const useReleaseDateConfirm = (heldDate: () => string | null | undefined) => {
    const { t } = useI18n();
    const session = useSessionStore();
    const dialog = useDialogStore();

    /**
     * What the dialog says: one clause per kind of contact, joined by a dot.
     *
     * @param impact - The preview's counts and deadline.
     */
    const messageOf = ({ notify, ask, answerBy }: ReleaseDateImpact): string =>
        [
            notify > 0 && t('product-edit-page.impact-notify', { count: notify }, notify),
            ask > 0 &&
                t('product-edit-page.impact-ask', { count: ask, date: formatDate(answerBy) }, ask),
            ask > 0 && t('product-edit-page.impact-silence')
        ]
            .filter(Boolean)
            .join(' · ');

    /**
     * Skipped, so the save goes ahead, when: the date is not a slip, the visitor may not read
     * orders (the call would be refused and logged as a forbidden call on every save), nobody is
     * reached, or the preview fails.
     *
     * @param productId - The product being saved.
     * @param current - The release-date input's value.
     * @returns Whether to go on and save.
     */
    const confirmReleaseDateMove = (
        productId: string,
        current?: string | null
    ): Promise<boolean> => {
        if (!isReleaseDateSlip(heldDate(), current) || !session.can('display', 'Order'))
            return Promise.resolve(true);
        // A cleared date sends no `releaseDate`: the contract reads absent as cleared.
        const releaseDate = fromDateTimeLocal(current) || undefined;
        return (
            previewReleaseDateImpact({ productId, releaseDate })
                .then(({ data }) =>
                    data.notify + data.ask === 0
                        ? true
                        : dialog.confirm({
                              title: t('product-edit-page.impact-title'),
                              message: messageOf(data),
                              confirmLabel: t('product-edit-page.button-submit'),
                              cancelLabel: t('product-edit-page.impact-back'),
                              color: 'warning'
                          })
                )
                // The preview is a courtesy: a module that is off (404), a server error or a dropped
                // connection must not stop the save.
                .catch(() => true)
        );
    };

    return { confirmReleaseDateMove };
};
