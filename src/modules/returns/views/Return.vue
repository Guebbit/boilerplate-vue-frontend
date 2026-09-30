<script lang="ts">
export default {
    name: 'ReturnTargetPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * One return: what comes back, who pays the postage, where it stands and — for staff — the moves
 * still open. Cache-first by route id, forced once when the cached row lacks `actions` (the list
 * seeds the cache with rows that carry none), so the detail read is always made once on arrival.
 */
import { useMissingRecord } from '@/infrastructure/utils/use-missing-record.ts';
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { Undo2 } from 'lucide-vue-next';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { linkIfRouted } from '@/kernel/route-link.ts';
import { useReturnsStore } from '@/modules/returns/store.ts';
import { formatCurrency, formatDateTime, formatText } from '@/infrastructure/utils/formatters.ts';
import ItemDetailLayout from '@/ui/organisms/ItemDetailLayout.vue';
import ItemDetailHero from '@/ui/organisms/ItemDetailHero.vue';
import ItemDetailField from '@/ui/molecules/ItemDetailField.vue';
import CardDetail from '@/ui/organisms/CardDetail.vue';
import ReturnStaffActions from '@/modules/returns/components/ReturnStaffActions.vue';

/**
 * Route return id.
 */
const { id } = defineProps<{
    id?: string;
}>();

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Router, for the link back to the order.
 */
const router = useRouter();

/**
 * Store reads: the selected return and the forced re-read a move needs.
 */
const { watchReturn, fetchReturn } = useReturnsStore();

/**
 * The return being displayed.
 */
const { currentReturn } = storeToRefs(useReturnsStore());

/**
 * The link to the order this return belongs to — `undefined`, hiding it, on a build with no
 * `orders` module: a route name is a dependency `MODULE_EDGES` cannot see, so it is guarded.
 */
const orderTo = computed(() =>
    currentReturn.value
        ? linkIfRouted(router, 'OrderTarget', { id: currentReturn.value.orderId })
        : undefined
);

/**
 * What a 404 or 403 on the routed record does: the Error page, not a page left on its placeholders.
 */
const onMissingRecord = useMissingRecord();

/**
 * Selects and fetches the return whenever the route id changes.
 */
watchReturn(() => id, { onError: onMissingRecord });

/**
 * Re-reads the return, forced past the cache — after a move, and once for a list-seeded row that
 * carries no `actions`.
 *
 * @returns A promise settling once the record is fresh; a missing record leaves for the Error page.
 */
const refresh = () =>
    id ? fetchReturn(id, { forced: true }).catch(onMissingRecord) : Promise.resolve();

onMounted(refresh);
</script>

<template>
    <div id="return-target">
        <ItemDetailLayout accent="tertiary">
            <template #hero>
                <ItemDetailHero
                    :title="
                        currentReturn
                            ? t(`returns-form.reason-${currentReturn.reason}`)
                            : t('return-target-page.page-title')
                    "
                    :description="formatText(currentReturn?.note)"
                    :eyebrow="currentReturn?.id"
                >
                    <template #icon><Undo2 :size="32" /></template>
                </ItemDetailHero>
            </template>

            <CardDetail>
                <div v-if="currentReturn" class="grid gap-4 sm:grid-cols-2">
                    <ItemDetailField :label="t('return-target-page.label-status')">
                        <v-chip variant="tonal" color="tertiary" data-test="return-status">
                            {{ t(`returns-form.status-${currentReturn.status}`) }}
                        </v-chip>
                    </ItemDetailField>
                    <ItemDetailField
                        :label="t('return-target-page.label-postage')"
                        :value="t(`return-target-page.postage-${currentReturn.returnPostage}`)"
                    />
                    <ItemDetailField
                        :label="t('return-target-page.label-created')"
                        :value="formatDateTime(currentReturn.createdAt)"
                    />
                    <ItemDetailField
                        v-if="currentReturn.receivedAt"
                        :label="t('return-target-page.label-received')"
                        :value="formatDateTime(currentReturn.receivedAt)"
                    />
                    <ItemDetailField
                        v-if="currentReturn.refundAmount !== undefined"
                        :label="t('return-target-page.label-refund')"
                        :value="formatCurrency(currentReturn.refundAmount, currentReturn.currency)"
                        data-test="return-refund"
                    />
                    <ItemDetailField
                        v-if="currentReturn.handlingDeduction"
                        :label="t('return-target-page.label-deduction')"
                        :value="
                            formatCurrency(currentReturn.handlingDeduction, currentReturn.currency)
                        "
                        data-test="return-deduction"
                    />
                    <ItemDetailField
                        v-if="currentReturn.declineReason"
                        :label="t('return-target-page.label-decline-reason')"
                        :value="currentReturn.declineReason"
                        full-width
                        data-test="return-decline-reason-text"
                    />
                </div>

                <h3 class="mt-6 text-base font-semibold">
                    {{ t('return-target-page.label-lines') }}
                </h3>
                <ul v-if="currentReturn" class="m-0 mt-2 flex list-none flex-col gap-2 p-0">
                    <li
                        v-for="line in currentReturn.lines"
                        :key="'return-line-' + line.productId"
                        class="flex items-center justify-between gap-3"
                        data-test="return-line"
                    >
                        <span>{{ line.title }} × {{ line.quantity }}</span>
                        <strong>
                            {{
                                formatCurrency(
                                    line.unitPrice * line.quantity,
                                    currentReturn.currency
                                )
                            }}
                        </strong>
                    </li>
                </ul>
            </CardDetail>

            <template #actions>
                <ReturnStaffActions v-if="currentReturn" :item="currentReturn" @changed="refresh" />
                <v-btn
                    v-if="orderTo"
                    variant="tonal"
                    data-test="return-order-link"
                    :to="routerLinkI18n(orderTo)"
                >
                    {{ t('return-target-page.button-order') }}
                </v-btn>
                <v-btn variant="tonal" :to="routerLinkI18n({ name: 'ReturnsList' })">
                    {{ t('return-target-page.button-list') }}
                </v-btn>
            </template>
        </ItemDetailLayout>
    </div>
</template>
