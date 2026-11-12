<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'ReturnTargetPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * One return: what comes back, who pays the postage, where it stands and — for staff — the moves
 * still open. Cache-first by route id, forced once on arrival (the list seeds the cache with list
 * items that carry no lines), so the detail read is always made once.
 */
import { useMissingRecord } from '@/infrastructure/utils/use-missing-record.ts';
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { Undo2 } from 'lucide-vue-next';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { useOrderLink } from '@/kernel/order-link.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import { useReturnsStore } from '../store.ts';
import { formatCurrency, formatDateTime, formatText } from '@/infrastructure/utils/formatters.ts';
import { compareDecimals, multiplyDecimal } from '@/infrastructure/utils/money.ts';
import ItemDetailLayout from '@/ui/organisms/ItemDetailLayout.vue';
import ItemDetailHero from '@/ui/organisms/ItemDetailHero.vue';
import ItemDetailField from '@/ui/molecules/ItemDetailField.vue';
import CardDetail from '@/ui/organisms/CardDetail.vue';
import { isWholeReturn } from '../domain/whole-return.ts';
import ReturnStaffActions from '../components/ReturnStaffActions.vue';

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
 * Store reads: the selected return and the forced re-read a move needs.
 */
const { watchReturn, fetchReturn } = useReturnsStore();

/**
 * The return being displayed.
 */
const { currentReturn } = storeToRefs(useReturnsStore());

/**
 * The order's page, or nothing when this build ships none.
 */
const orderLink = useOrderLink();

/**
 * Signed-in caller: only staff are shown the exceptions a staff-opened return recorded.
 */
const session = useSessionStore();

/**
 * The routed return's order page.
 */
const orderTo = computed(() => orderLink(currentReturn.value?.orderId));

/**
 * What a 404 or 403 on the routed record does: the Error page, not a page left on its placeholders.
 */
const onMissingRecord = useMissingRecord();

/**
 * Selects and fetches the return whenever the route id changes.
 */
watchReturn(() => id, { onError: onMissingRecord });

/**
 * The routed return once the whole record is in. A list-seeded row is a `ReturnListItem`, a
 * preview: the header and status render from it, everything else waits for this.
 */
const detail = computed(() =>
    currentReturn.value && isWholeReturn(currentReturn.value) ? currentReturn.value : undefined
);

/**
 * Re-reads the return, forced past the cache — after a move, and once on arrival, since a
 * list-seeded row is only a list item.
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
                    :description="formatText(detail?.note)"
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
                        :label="t('return-target-page.label-created')"
                        :value="formatDateTime(currentReturn.createdAt)"
                    />
                    <template v-if="detail">
                        <ItemDetailField
                            :label="t('return-target-page.label-postage')"
                            :value="t(`return-target-page.postage-${detail.returnPostage}`)"
                        />
                        <ItemDetailField
                            :label="
                                detail.statedVia
                                    ? t('return-target-page.label-stated')
                                    : t('return-target-page.label-requested')
                            "
                            :value="
                                detail.statedVia
                                    ? t('return-target-page.stated', {
                                          date: formatDateTime(detail.requestedAt),
                                          channel: t(`stated-at-fields.channel-${detail.statedVia}`)
                                      })
                                    : formatDateTime(detail.requestedAt)
                            "
                            data-test="return-stated"
                        />
                        <ItemDetailField
                            v-if="detail.openedBy === 'staff'"
                            :label="t('return-target-page.label-opened-by')"
                            :value="t('return-target-page.opened-by-staff')"
                            data-test="return-opened-by"
                        />
                        <ItemDetailField
                            v-if="
                                session.can('read', 'Return') && detail.policyExceptions.length > 0
                            "
                            :label="t('return-target-page.label-exceptions')"
                            full-width
                            data-test="return-exceptions"
                        >
                            <v-chip
                                v-for="exception in detail.policyExceptions"
                                :key="'exception-' + exception"
                                size="small"
                                variant="tonal"
                                color="warning"
                                class="mr-1"
                            >
                                {{ t(`return-target-page.exception-${exception}`) }}
                            </v-chip>
                        </ItemDetailField>
                        <ItemDetailField
                            v-if="detail.preferredRemedy"
                            :label="t('return-target-page.label-preferred-remedy')"
                            :value="t(`return-target-page.remedy-${detail.preferredRemedy}`)"
                            data-test="return-preferred-remedy"
                        />
                        <ItemDetailField
                            v-if="detail.remedy"
                            :label="t('return-target-page.label-remedy')"
                            :value="t(`return-target-page.remedy-${detail.remedy}`)"
                            data-test="return-remedy"
                        />
                        <ItemDetailField
                            v-if="detail.receivedAt"
                            :label="t('return-target-page.label-received')"
                            :value="formatDateTime(detail.receivedAt)"
                        />
                        <ItemDetailField
                            v-if="detail.refundAmount !== undefined"
                            :label="t('return-target-page.label-refund')"
                            :value="formatCurrency(detail.refundAmount, detail.currency)"
                            data-test="return-refund"
                        />
                        <ItemDetailField
                            v-if="compareDecimals(detail.handlingDeduction ?? '0', '0') > 0"
                            :label="t('return-target-page.label-deduction')"
                            :value="formatCurrency(detail.handlingDeduction, detail.currency)"
                            data-test="return-deduction"
                        />
                        <ItemDetailField
                            v-if="detail.declineReason"
                            :label="t('return-target-page.label-decline-reason')"
                            :value="
                                t(`return-staff-actions.decline-reason-${detail.declineReason}`)
                            "
                            full-width
                            data-test="return-decline-reason-text"
                        />
                        <ItemDetailField
                            v-if="detail.declineMessage"
                            :label="t('return-target-page.label-decline-message')"
                            :value="detail.declineMessage"
                            full-width
                            data-test="return-decline-message-text"
                        />
                    </template>
                </div>

                <!-- A list-seeded row has no lines yet: the block waits for the full record. -->
                <h3 v-if="detail" class="mt-6 text-base font-semibold">
                    {{ t('return-target-page.label-lines') }}
                </h3>
                <p
                    v-if="detail && detail.lines.length === 0"
                    class="m-0 mt-2 text-sm opacity-75"
                    data-test="return-no-lines"
                >
                    {{ t('return-target-page.no-lines') }}
                </p>
                <ul v-if="detail" class="m-0 mt-2 flex list-none flex-col gap-2 p-0">
                    <li
                        v-for="line in detail.lines"
                        :key="'return-line-' + line.productId"
                        class="flex items-center justify-between gap-3"
                        data-test="return-line"
                    >
                        <span>{{ line.title }} × {{ line.quantity }}</span>
                        <strong>
                            {{
                                formatCurrency(
                                    multiplyDecimal(line.unitPrice, line.quantity),
                                    detail.currency
                                )
                            }}
                        </strong>
                    </li>
                </ul>
            </CardDetail>

            <template #actions>
                <!-- Its setup reads `item.lines`, so it mounts only on the full record. -->
                <ReturnStaffActions v-if="detail" :item="detail" @changed="refresh" />
                <v-btn v-if="orderTo" variant="tonal" data-test="return-order-link" :to="orderTo">
                    {{ t('return-target-page.button-order') }}
                </v-btn>
                <v-btn variant="tonal" :to="routerLinkI18n({ name: 'ReturnsList' })">
                    {{ t('return-target-page.button-list') }}
                </v-btn>
            </template>
        </ItemDetailLayout>
    </div>
</template>
