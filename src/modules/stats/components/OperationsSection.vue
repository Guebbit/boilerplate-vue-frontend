<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'OperationsSection'
};
</script>

<script setup lang="ts">
/**
 * @module
 * How the shop is running: the payments mix, the cancellation, return and refund rates, new
 * versus returning customers, and what is waiting right now. Every number is the API's; this only
 * words and formats them.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import CardMaterialStat from '@/ui/organisms/CardMaterialStat.vue';
import { formatCurrency, formatDate, formatPercent } from '@/infrastructure/utils/formatters.ts';
import type { CustomerStats, OperationsStats, PaymentMix, PipelineStats } from '@types';
import type { ChartModel } from '../domain';
import ChartWithTable from './ChartWithTable.vue';

/**
 * The four answers this block reads.
 */
const props = defineProps<{
    /** `GET /stats/payments`. */
    paymentMix?: PaymentMix;
    /** `GET /stats/operations`. */
    operations?: OperationsStats;
    /** `GET /stats/customers`. */
    customers?: CustomerStats;
    /** `GET /stats/pipeline`. */
    pipeline?: PipelineStats;
}>();

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * One pie of payment counts per currency, a slice per method and provider.
 */
const mixCharts = computed(() => {
    const rows = props.paymentMix?.rows ?? [];
    return [...new Set(rows.map(({ currency }) => currency))].map((currency): ChartModel => {
        const own = rows.filter((row) => row.currency === currency);
        return {
            title: t('stats-page.mix-title', { currency }),
            labels: own.map(
                ({ method, provider }) => `${t(`stats-page.method-${method}`)} · ${provider}`
            ),
            series: [
                {
                    name: t('stats-page.column-payments'),
                    kind: 'bar',
                    values: own.map(({ payments }) => payments)
                }
            ]
        };
    });
});
</script>

<template>
    <section aria-labelledby="stats-operations-heading" data-test="stats-operations">
        <h2 id="stats-operations-heading" class="mb-3 text-xl font-semibold">
            {{ t('stats-page.heading-operations') }}
        </h2>

        <div class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <template v-if="operations">
                <CardMaterialStat
                    :title="t('stats-page.card-cancellation')"
                    :value="formatPercent(operations.cancellation.rate)"
                    :subtitle="
                        t('stats-page.cancellation-detail', {
                            cancelled: operations.cancellation.cancelled,
                            placed: operations.cancellation.placed
                        })
                    "
                    data-test="card-cancellation"
                />
                <CardMaterialStat
                    :title="t('stats-page.card-returns')"
                    :value="formatPercent(operations.returns.rate)"
                    :subtitle="
                        t('stats-page.returns-detail', {
                            returned: operations.returns.unitsReturned,
                            ordered: operations.returns.unitsOrdered
                        })
                    "
                    data-test="card-returns"
                />
                <CardMaterialStat
                    v-for="refund in operations.refunds"
                    :key="refund.currency"
                    :title="t('stats-page.card-refund-rate', { currency: refund.currency })"
                    :value="formatPercent(refund.rate)"
                    :subtitle="
                        t('stats-page.refund-detail', {
                            credited: formatCurrency(refund.credited, refund.currency),
                            invoiced: formatCurrency(refund.invoiced, refund.currency)
                        })
                    "
                    data-test="card-refund-rate"
                />
            </template>
            <template v-if="customers">
                <CardMaterialStat
                    :title="t('stats-page.card-customers')"
                    :value="customers.customers"
                    :subtitle="
                        t('stats-page.customers-detail', {
                            new: customers.newCustomers,
                            returning: customers.returningCustomers
                        })
                    "
                    data-test="card-customers"
                />
                <CardMaterialStat
                    :title="t('stats-page.card-returning-rate')"
                    :value="formatPercent(customers.returningRate)"
                    data-test="card-returning-rate"
                />
            </template>
            <template v-if="pipeline">
                <CardMaterialStat
                    v-for="waiting in pipeline.awaitingTransfers"
                    :key="waiting.currency"
                    :title="t('stats-page.card-awaiting', { currency: waiting.currency })"
                    :value="formatCurrency(waiting.amount, waiting.currency)"
                    :subtitle="
                        waiting.nearestPayBy
                            ? t('stats-page.awaiting-detail', {
                                  count: waiting.count,
                                  date: formatDate(waiting.nearestPayBy)
                              })
                            : t('stats-page.awaiting-count', { count: waiting.count })
                    "
                    data-test="card-awaiting"
                />
                <CardMaterialStat
                    :title="t('stats-page.card-paid-not-shipped')"
                    :value="pipeline.paidNotShipped"
                    data-test="card-paid-not-shipped"
                />
            </template>
        </div>

        <ChartWithTable
            v-for="chart in mixCharts"
            :key="chart.title"
            :chart="chart"
            kind="pie"
            :label-title="t('stats-page.column-method')"
            file-name="payments-mix"
        />
        <p v-if="!paymentMix && !operations" class="opacity-75" data-test="operations-empty">
            {{ t('stats-page.no-data') }}
        </p>
        <p class="mb-8 text-sm opacity-75">{{ t('stats-page.note-operations') }}</p>
    </section>
</template>
