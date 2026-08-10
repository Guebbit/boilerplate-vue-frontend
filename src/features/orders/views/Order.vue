<script lang="ts">
export default {
    name: 'OrderTargetPage'
};
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useOrdersStore } from '@/features/orders/store.ts';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import { Download, ShoppingCart } from 'lucide-vue-next';
import ItemDetailField from '@/components/molecules/ItemDetailField.vue';
import ItemDetailLayout from '@/components/organisms/ItemDetailLayout.vue';
import CardDetail from '@/components/organisms/CardDetail.vue';
import CardInfo from '@/components/organisms/CardInfo.vue';
import ItemDetailHero from '@/components/organisms/ItemDetailHero.vue';
import CardMaterialStat from '@/components/organisms/CardMaterialStat.vue';
import { EMPTY_VALUE, formatText, formatDateTime, formatCurrency } from '@/utils/formatters.ts';
import { notifyErrorMessages } from '@/utils/errors.ts';
import { downloadBlob } from '@guebbit/js-toolkit';

/**
 * Generic translation and notification accessors.
 */
const { t } = useI18n();
const { addMessage } = useNotificationsStore();

/**
 * Route order id.
 */
const { id } = defineProps<{
    id?: string;
}>();

/**
 * Store API and reactive order references.
 */
const { watchOrder, downloadInvoice: fetchInvoice } = useOrdersStore();
const { currentOrder, loading } = storeToRefs(useOrdersStore());

/**
 * Hero heading.
 *
 * @returns The loaded order id, the route id while loading, or the generic page
 *  title as a last resort.
 */
const heroTitle = computed(() => currentOrder.value?.id ?? id ?? t('order-target-page.page-title'));

/**
 * Hero subheading.
 *
 * @returns The order notes, falling back to the customer email, then to the
 *  empty-value glyph.
 */
const heroDescription = computed(() =>
    formatText(currentOrder.value?.notes || currentOrder.value?.email)
);

/**
 * Localized order status.
 *
 * @returns The translated status label, or the empty-value glyph when the order
 *  carries no status yet.
 */
const orderStatus = computed(() => {
    const status = currentOrder.value?.status;
    return status ? t(`orders-form.status-${status}`) : EMPTY_VALUE;
});

/**
 * Downloads the server-generated invoice as a PDF file.
 *
 * @returns A promise resolving once the download has been triggered; a missing
 *  route id or empty response is a no-op, and failures surface as a toast.
 */
const downloadInvoice = () => {
    if (!id) return;
    return fetchInvoice(id)
        .then((blob) => {
            if (!blob) return;
            downloadBlob(blob, `order-${id}-invoice.pdf`);
        })
        .catch((error: unknown) => notifyErrorMessages(addMessage, error));
};

/**
 * Selects and (re)fetches the order whenever the route id changes.
 */
watchOrder(() => id);
</script>

<template>
    <LayoutDefault id="order-target" :title="t('order-target-page.page-title')">
        <ItemDetailLayout accent="tertiary">
            <template #hero>
                <ItemDetailHero
                    :title="heroTitle"
                    :description="heroDescription"
                    :eyebrow="currentOrder?.id"
                >
                    <template #icon><ShoppingCart :size="32" /></template>
                </ItemDetailHero>
            </template>

            <template #stats>
                <CardMaterialStat
                    :title="t('order-target-page.label-status')"
                    :value="orderStatus"
                />
                <CardMaterialStat
                    :title="t('order-target-page.label-total')"
                    :value="formatCurrency(currentOrder?.totalPrice)"
                    accent="secondary"
                />
                <CardMaterialStat
                    :title="t('order-target-page.label-items')"
                    :value="currentOrder?.items?.length ?? 0"
                    accent="tertiary"
                />
            </template>

            <CardDetail>
                <h3 class="mb-5 text-lg font-semibold">{{ t('generic.details') }}</h3>

                <div v-if="currentOrder" class="grid gap-4 sm:grid-cols-2">
                    <ItemDetailField
                        :label="t('order-target-page.label-order-id')"
                        :value="currentOrder.id"
                        icon="#"
                    />
                    <ItemDetailField :label="t('order-target-page.label-status')" icon="●">
                        <v-chip variant="tonal" color="tertiary" class="font-semibold">
                            {{ orderStatus }}
                        </v-chip>
                    </ItemDetailField>
                    <ItemDetailField
                        :label="t('order-target-page.label-total')"
                        :value="formatCurrency(currentOrder.totalPrice)"
                        icon="💶"
                    />
                    <ItemDetailField
                        :label="t('orders-list-page.filter-email')"
                        :value="formatText(currentOrder.email)"
                        icon="✉"
                    />
                    <ItemDetailField
                        :label="t('order-target-page.label-notes')"
                        :value="formatText(currentOrder.notes)"
                        icon="📝"
                        full-width
                    />
                </div>
                <p v-else class="m-0 opacity-75">{{ t('order-target-page.loading') }}</p>
            </CardDetail>

            <template #aside>
                <CardDetail as="aside" class="flex flex-col gap-4">
                    <CardInfo :title="heroTitle" :description="heroDescription" variant="tertiary">
                        <template #icon><ShoppingCart :size="28" /></template>
                    </CardInfo>
                    <ItemDetailField
                        :label="t('order-target-page.label-date')"
                        :value="formatDateTime(currentOrder?.createdAt)"
                        icon="📅"
                    />
                    <ItemDetailField
                        :label="t('order-target-page.label-updated-at')"
                        :value="formatDateTime(currentOrder?.updatedAt)"
                        icon="🕘"
                    />

                    <div>
                        <h3 class="m-0 text-base font-semibold">
                            {{ t('order-target-page.label-items') }}
                        </h3>
                        <div v-if="currentOrder?.items?.length" class="mt-3 grid gap-3">
                            <article
                                v-for="item in currentOrder.items"
                                :key="'order-item-' + item.product.id"
                                class="rounded-2xl border border-on-surface/10 bg-on-surface/3 p-4"
                            >
                                <div
                                    class="mb-2 flex items-center justify-between gap-3 font-semibold"
                                >
                                    <span>{{ item.product.title || item.product.id }}</span>
                                    <v-chip size="small" variant="tonal" color="tertiary">
                                        × {{ item.quantity }}
                                    </v-chip>
                                </div>
                                <div class="flex items-center justify-between gap-3">
                                    <p class="m-0 opacity-75">
                                        {{ t('order-target-page.label-product-id') }}
                                    </p>
                                    <strong>{{ item.product.id }}</strong>
                                </div>
                            </article>
                        </div>
                        <p v-else class="m-0 mt-2 opacity-75">{{ t('generic.no-data') }}</p>
                    </div>
                </CardDetail>
            </template>

            <template #actions>
                <v-btn
                    v-if="currentOrder"
                    color="secondary"
                    :to="routerLinkI18n({ name: 'OrderEdit', params: { id: currentOrder.id } })"
                >
                    {{ t('order-target-page.button-go-to-edit') }}
                </v-btn>
                <v-btn
                    v-if="currentOrder"
                    variant="tonal"
                    color="tertiary"
                    :disabled="loading"
                    @click="downloadInvoice"
                >
                    <Download :size="16" class="mr-1" aria-hidden="true" />
                    {{ t('order-target-page.button-download-invoice') }}
                </v-btn>
                <v-btn variant="tonal" :to="routerLinkI18n({ name: 'OrdersList' })">
                    {{ t('order-target-page.button-go-to-list') }}
                </v-btn>
            </template>
        </ItemDetailLayout>
    </LayoutDefault>
</template>
