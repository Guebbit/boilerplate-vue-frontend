<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'ProductTargetPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Public product detail page: renders the fetched record, and hosts the `product-actions` slot
 * where other modules put the storefront's visitor writes (add to cart, toggle wishlist).
 */
import { useMissingRecord } from '@/infrastructure/utils/use-missing-record.ts';
import { computed, watch } from 'vue';
import { useHistoryLink } from '@/kernel/history-link.ts';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useProductsStore } from '../store';
import { shelfStateOf } from '../domain';
import { useSlot } from '@/kernel/slots';
import { availabilityOf, stockCountOf } from '@/kernel/availability.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import { useAnalyticsConsentStore } from '@/infrastructure/analytics-consent.ts';
import { Calendar, Circle, Clock, Euro, FileText, Hash, Package, Tag } from 'lucide-vue-next';
import ItemDetailField from '@/ui/molecules/ItemDetailField.vue';
import ItemDetailLayout from '@/ui/organisms/ItemDetailLayout.vue';
import CardDetail from '@/ui/organisms/CardDetail.vue';
import RecordAsideCard from '@/ui/organisms/RecordAsideCard.vue';
import type { DetailFieldRow } from '@/ui/types.ts';
import ItemDetailHero from '@/ui/organisms/ItemDetailHero.vue';
import CardMaterialStat from '@/ui/organisms/CardMaterialStat.vue';
import {
    formatText,
    formatDay,
    formatDateTime,
    formatCurrency,
    formatFlag
} from '@/infrastructure/utils/formatters.ts';
import { backorderPromiseDays } from '@/modules/shop';

/**
 * Localized dictionary helper.
 */
const { t } = useI18n();

/**
 * Route-provided product id.
 */
const { id } = defineProps<{
    id?: string;
}>();

/**
 * Product store's watch action.
 */
const { watchProduct } = useProductsStore();

/**
 * Product store's reactive current-record reference.
 */
const { currentProduct } = storeToRefs(useProductsStore());

/**
 * Hero heading.
 *
 * @returns The loaded product title, the route id while loading, or the generic
 *  page title as a last resort.
 */
const heroTitle = computed(
    () => currentProduct.value?.title ?? id ?? t('product-target-page.page-title')
);

/**
 * Hero subheading.
 *
 * @returns The product description, or the empty-value glyph when blank.
 */
const heroDescription = computed(() => formatText(currentProduct.value?.description));

/**
 * Label of the status chip.
 *
 * @returns The localized enabled/disabled wording, or the empty-value glyph
 *  while the product is unknown.
 */
const productStatus = computed(() =>
    formatFlag(currentProduct.value?.active, t('generic.enabled'), t('generic.disabled'))
);

/**
 * What a 404 or 403 on the routed record does: the Error page, not a page left on its placeholders.
 */
const onMissingRecord = useMissingRecord();

/**
 * Selects and (re)fetches the product whenever the route id changes — and whenever the language
 * does: the products store scopes its cache by locale (`dependsOn`), and the toolkit re-runs an
 * active watcher under the new scope, since the API resolves `title` and `description` against
 * the caller's language.
 *
 * `staleTime: 0` makes every open a refetch (the lists keep the store's five minutes): the cached
 * copy renders at once and the fresh one is swapped in — stale-while-revalidate — so an edit made
 * elsewhere shows on the page that carries the details. The server answers a 304 while nothing
 * changed. The stock signal is not part of this answer: it is the availability read below.
 */
watchProduct(() => id, { staleTime: 0, onError: onMissingRecord });

/**
 * The availability watcher `inventory` contributes: the product's stock signal is its own read
 * beside the details (`GET /products/{id}/availability`), with `staleTime: 0` too: this page is
 * where a stock number is read, so every open asks again, and coming back to the tab does as well.
 * A stock reader's shelf count rides along. A slot because `inventory` owns the read and `products`
 * cannot depend on it (`@/kernel/availability`).
 */
const availabilityWatchers = useSlot('availability-watch');

/**
 * The product id as the watcher takes it.
 */
const watchedIds = computed(() => (id ? [id] : []));

/**
 * Reports the page view to the analytics relay, once per product opened. The response cache hides
 * most product reads from the server, so the page says it; a no-op until the visitor has agreed.
 */
const { trackBrowsing } = useAnalyticsConsentStore();

watch(
    () => id,
    (productId) => {
        if (productId) trackBrowsing({ event: 'product_viewed', productId });
    },
    { immediate: true }
);

/**
 * The History link: the audit log filtered on the product. Hidden without `read:AuditLog`, or on a
 * build with no audit log.
 */
const historyTo = useHistoryLink(() => currentProduct.value?.id);

/**
 * Session store, read for whether the visitor is signed in.
 */
const session = useSessionStore();

/**
 * Whether a visitor is signed in — a guest is told to sign in instead of being offered the
 * storefront actions.
 */
const { isAuth } = storeToRefs(session);

/**
 * The storefront buttons other modules contribute (add to cart, save to wishlist). This page
 * owns the slot and hands each component the product; it never learns who they are.
 */
const productActions = useSlot('product-actions');

/**
 * What the stock stat reads: the server's availability, and for a stock reader the shelf count
 * beside it (`GET /inventory/levels/{id}`). Everyone else gets the signal alone, so a competitor
 * cannot read the shelf.
 *
 * @returns the stat's value.
 */
const stockLabel = computed(() => {
    const shown = currentProduct.value;
    if (!shown) return formatText(undefined);
    const availability = availabilityOf(shown.id);
    // A stock reader's shelf count, read by the watcher; `undefined` for everyone else.
    const count = stockCountOf(shown.id);
    const shelf = shelfStateOf(shown, availability);
    // Not read yet: the empty-value glyph, not a guess.
    if (shelf === undefined) return formatText(undefined);
    // Off sale outranks the stock badge: the product is listed, but cannot be bought.
    if (shelf === 'off-sale') return t('product-target-page.off-sale');
    // A preorder is bought before it exists: the shelf may be empty, the date is what matters.
    if (shelf === 'preorder')
        return t('product-target-page.preorder', {
            date: formatDay(availability?.availabilityDate)
        });
    // A backorder is bought now and ships by its restock date, or within 30 days when none is named.
    if (shelf === 'backorder')
        return shown.restockDate
            ? t('product-target-page.backorder', {
                  date: formatDay(availability?.availabilityDate)
              })
            : t('product-target-page.backorder-undated', { days: backorderPromiseDays.value });
    if (shelf === 'out-of-stock') return t('product-target-page.out-of-stock');
    // "Only N left" below the frontend's threshold: the number any shopper may read.
    if (shelf === 'low-stock')
        return t('product-target-page.low-stock', { count: availability?.quantityAvailable ?? 0 });
    return count === undefined ? t('product-target-page.in-stock') : formatText(count.toString());
});

/**
 * The rows of the aside summary card: identity and timestamps, formatted for display.
 */
const asideFields = computed<DetailFieldRow[]>(() => [
    {
        label: t('product-target-page.label-created-at'),
        value: formatDateTime(currentProduct.value?.createdAt),
        icon: Calendar
    },
    {
        label: t('product-target-page.label-updated-at'),
        value: formatDateTime(currentProduct.value?.updatedAt),
        icon: Clock
    }
]);
</script>

<template>
    <div id="product-target">
        <component
            :is="watcher"
            v-for="(watcher, index) in availabilityWatchers"
            :key="index"
            :product-ids="watchedIds"
            :stale-time="0"
            with-stock-count
        />
        <ItemDetailLayout accent="primary">
            <template #hero>
                <ItemDetailHero
                    :title="heroTitle"
                    :description="heroDescription"
                    :eyebrow="currentProduct?.id"
                    :has-image="true"
                    :image-url="currentProduct?.imageUrl"
                    :thumbnail-url="currentProduct?.thumbnailUrl"
                    :image-alt="t('product-target-page.image-alt', { name: heroTitle })"
                />
            </template>

            <template #stats>
                <CardMaterialStat
                    :title="t('product-target-page.label-price')"
                    :value="formatCurrency(currentProduct?.price, currentProduct?.currency ?? '')"
                />
                <CardMaterialStat
                    data-test="product-stock"
                    :title="t('product-target-page.label-stock')"
                    :value="stockLabel"
                    accent="secondary"
                />
                <CardMaterialStat
                    :title="t('product-target-page.label-active')"
                    :value="
                        formatFlag(
                            currentProduct?.active,
                            t('generic.enabled'),
                            t('generic.disabled')
                        )
                    "
                    accent="secondary"
                />
                <CardMaterialStat
                    :title="t('product-target-page.label-created-at')"
                    :value="formatDateTime(currentProduct?.createdAt)"
                    accent="tertiary"
                />
            </template>

            <v-card v-if="currentProduct" class="flex flex-wrap items-start gap-4 p-5">
                <component
                    :is="action"
                    v-for="(action, index) in productActions"
                    :key="index"
                    :product="currentProduct"
                />
                <p v-if="!isAuth" class="text-sm opacity-muted">
                    {{ t('product-target-page.login-to-buy') }}
                </p>
            </v-card>

            <CardDetail :title="t('generic.details')">
                <div v-if="currentProduct" class="grid gap-4 sm:grid-cols-2">
                    <ItemDetailField
                        :label="t('product-target-page.label-id')"
                        :value="currentProduct.id"
                        :icon="Hash"
                    />
                    <ItemDetailField
                        :label="t('product-target-page.label-title')"
                        :value="currentProduct.title"
                        :icon="Tag"
                    />
                    <ItemDetailField
                        :label="t('product-target-page.label-price')"
                        :value="formatCurrency(currentProduct.price, currentProduct.currency)"
                        :icon="Euro"
                    />
                    <ItemDetailField :label="t('product-target-page.label-active')" :icon="Circle">
                        <v-chip variant="tonal" color="primary" class="font-semibold">
                            {{ productStatus }}
                        </v-chip>
                    </ItemDetailField>
                    <ItemDetailField
                        :label="t('product-target-page.label-purchasable')"
                        :value="
                            formatFlag(
                                currentProduct.purchasable,
                                t('generic.enabled'),
                                t('generic.disabled')
                            )
                        "
                        :icon="Circle"
                        data-test="product-purchasable"
                    />
                    <ItemDetailField
                        v-if="currentProduct.releaseDate"
                        :label="t('product-target-page.label-release-date')"
                        :value="formatDay(currentProduct.releaseDate)"
                        :icon="Calendar"
                        data-test="product-release-date"
                    />
                    <ItemDetailField
                        v-if="currentProduct.noWithdrawal"
                        :label="t('product-target-page.label-no-withdrawal')"
                        :value="t('product-target-page.no-withdrawal-notice')"
                        :icon="Circle"
                        full-width
                        data-test="product-no-withdrawal"
                    />
                    <ItemDetailField
                        :label="t('product-target-page.label-description')"
                        :value="formatText(currentProduct.description)"
                        :icon="FileText"
                        full-width
                    />
                    <ItemDetailField
                        :label="t('product-target-page.label-updated-at')"
                        :value="formatDateTime(currentProduct.updatedAt)"
                        :icon="Clock"
                        full-width
                    />
                </div>
                <p v-else class="m-0 opacity-75">{{ t('generic.loading-state') }}</p>
            </CardDetail>

            <template #aside>
                <RecordAsideCard
                    :title="heroTitle"
                    :description="heroDescription"
                    accent="primary"
                    :fields="asideFields"
                >
                    <template #icon><Package :size="28" /></template>
                </RecordAsideCard>
            </template>

            <template #actions>
                <v-btn
                    v-if="currentProduct?.actions.update"
                    color="secondary"
                    data-test="go-to-edit"
                    :to="routerLinkI18n({ name: 'ProductEdit', params: { id: currentProduct.id } })"
                >
                    {{ t('product-target-page.button-go-to-edit') }}
                </v-btn>
                <v-btn v-if="historyTo" variant="tonal" data-test="product-history" :to="historyTo">
                    {{ t('generic.button-history') }}
                </v-btn>
                <v-btn variant="tonal" :to="routerLinkI18n({ name: 'ProductsList' })">
                    {{ t('product-target-page.button-go-to-list') }}
                </v-btn>
            </template>
        </ItemDetailLayout>
    </div>
</template>
