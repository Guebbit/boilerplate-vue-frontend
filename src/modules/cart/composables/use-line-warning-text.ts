/**
 * @module
 * The sentence for what stock did to a cart line's last write, shared by the signed-in cart and the
 * guest cart so the two say the same thing: "Only 20 available, so the line was set to 20 instead
 * of 25", or "{title} cannot be bought right now, so nothing was added".
 */
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useCartStore } from '../store';

/**
 * Binds the warning sentence to the cart store's `lineWarnings` and the active language.
 *
 * @param titleOf - Names a line's product, for the "cannot be bought" sentence.
 * @returns A reader: the message for a product, or `undefined` when its last write landed as asked.
 */
export const useLineWarningText = (titleOf: (productId: string) => string) => {
    const { t } = useI18n();

    const { lineWarnings } = storeToRefs(useCartStore());

    return (productId: string): string | undefined => {
        const warning = lineWarnings.value[productId];
        if (warning === undefined) return undefined;
        return warning.code === 'MERCHANDISE_OUT_OF_STOCK'
            ? t('cart-page.warning-out-of-stock', { title: titleOf(productId) })
            : t('cart-page.warning-not-enough-stock', {
                  requested: warning.requested,
                  resulting: warning.resulting
              });
    };
};
