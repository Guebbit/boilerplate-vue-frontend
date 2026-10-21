/**
 * @module
 * The hero texts every order-detail page shows — heading, subheading and the translated status —
 * derived from the store's current order. Each page passes only its own fallback heading key.
 */
import { computed, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { EMPTY_VALUE, formatText } from '@/infrastructure/utils/formatters.ts';
import type { Order } from '@types';

/**
 * Hero heading, subheading and status label for one order.
 *
 * @param currentOrder - The order shown.
 * @param targetId - The routed order id, shown as the heading while the order loads.
 * @param pageTitleKey - Translation key of the page's own title, the heading's last resort.
 * @returns The three computed labels.
 */
export const useOrderHero = (
    currentOrder: Ref<Order | undefined>,
    targetId: () => string | undefined,
    pageTitleKey: string
) => {
    /**
     * Translation function.
     */
    const { t } = useI18n();

    /**
     * Hero heading: the loaded order id, the route id while loading, then the page title.
     */
    const heroTitle = computed(() => currentOrder.value?.id ?? targetId() ?? t(pageTitleKey));

    /**
     * Hero subheading: the order notes, falling back to the customer email, then to the
     * empty-value glyph.
     */
    const heroDescription = computed(() =>
        formatText(currentOrder.value?.notes || currentOrder.value?.email)
    );

    /**
     * Localized order status, or the empty-value glyph when the order carries none yet.
     */
    const orderStatus = computed(() => {
        const status = currentOrder.value?.status;
        return status ? t(`orders-form.status-${status}`) : EMPTY_VALUE;
    });

    return { heroTitle, heroDescription, orderStatus };
};
