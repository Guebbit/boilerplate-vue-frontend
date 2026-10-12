<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'SalesSection'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The sales block, one group per currency: headline cards with the change against the previous
 * period, total sales and orders over time, and the revenue table. Presentational — it formats what
 * the API computed and does no sums of its own.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Download } from 'lucide-vue-next';
import { vFocusableScroll } from '@/ui/directives/focusable-scroll';
import { downloadBlob } from '@guebbit/js-toolkit';
import CardMaterialStat from '@/ui/organisms/CardMaterialStat.vue';
import { formatCurrency, formatPercent } from '@/infrastructure/utils/formatters.ts';
import type { SalesCurrency, SalesFigures, SalesStats } from '@types';
import { bucketLabel, isFlat, percentChange, toCsv } from '../domain';
import type { ChartModel } from '../domain';
import ChartWithTable from './ChartWithTable.vue';

/**
 * The sales answer, or nothing before the first load.
 */
const props = defineProps<{
    /** `GET /stats/sales`. */
    sales?: SalesStats;
}>();

/**
 * Translation function and the active locale.
 */
const { t, locale } = useI18n();

/**
 * The money figures a card shows, in the order of the row, with how each is formatted.
 */
const CARD_FIELDS = [
    { key: 'totalSales', title: 'stats-page.card-total-sales', money: true },
    { key: 'netSales', title: 'stats-page.card-net-sales', money: true },
    { key: 'orders', title: 'stats-page.card-orders', money: false },
    { key: 'averageOrderValue', title: 'stats-page.card-aov', money: true },
    { key: 'netUnits', title: 'stats-page.card-net-units', money: false },
    { key: 'refunds', title: 'stats-page.card-refunds', money: true }
] as const satisfies readonly {
    key: keyof SalesFigures;
    title: string;
    money: boolean;
}[];

/**
 * Every currency group, ready to render.
 */
const groups = computed(() =>
    (props.sales?.currencies ?? []).map((group) => ({
        group,
        cards: CARD_FIELDS.map(({ key, title, money }) => ({
            key,
            title: t(title),
            value: money
                ? formatCurrency(group.totals[key], group.currency)
                : String(group.totals[key]),
            subtitle: changeText(percentChange(group.totals[key], group.previous[key]))
        })),
        charts: chartsOf(group)
    }))
);

/**
 * Words for a change against the previous period.
 *
 * @param change - A fraction, or `undefined` when there is no earlier figure.
 * @returns The sentence the card carries under its value.
 */
function changeText(change: number | undefined): string {
    if (change === undefined) return t('stats-page.change-none');
    if (isFlat(change)) return t('stats-page.change-flat');
    const signed = `${change > 0 ? '+' : ''}${formatPercent(change)}`;
    return t('stats-page.change-vs-previous', { change: signed });
}

/**
 * The two over-time charts of one currency.
 *
 * @param group - The currency's totals and buckets.
 * @returns Total sales and orders per bucket, on separate axes: money and counts do not share one.
 */
function chartsOf(group: SalesCurrency): { sales: ChartModel; orders: ChartModel } {
    const labels = group.buckets.map(({ start }) =>
        bucketLabel(
            start,
            props.sales?.period.timeZone ?? 'UTC',
            props.sales?.period.interval ?? 'day',
            locale.value
        )
    );
    return {
        sales: {
            title: t('stats-page.chart-total-sales', { currency: group.currency }),
            labels,
            yTitle: group.currency,
            series: [
                {
                    name: t('stats-page.series-total-sales'),
                    kind: 'bar',
                    values: group.buckets.map(({ figures }) => figures.totalSales)
                }
            ]
        },
        orders: {
            title: t('stats-page.chart-orders'),
            labels,
            yTitle: t('stats-page.series-orders'),
            series: [
                {
                    name: t('stats-page.series-orders'),
                    kind: 'line',
                    values: group.buckets.map(({ figures }) => figures.orders)
                }
            ]
        }
    };
}

/**
 * The revenue table's columns.
 */
const COLUMNS = [
    { key: 'orders', title: 'stats-page.column-orders' },
    { key: 'grossSales', title: 'stats-page.column-gross' },
    { key: 'reversals', title: 'stats-page.column-reversals' },
    { key: 'netSales', title: 'stats-page.column-net' },
    { key: 'taxes', title: 'stats-page.column-taxes' },
    { key: 'shipping', title: 'stats-page.column-shipping' },
    { key: 'totalSales', title: 'stats-page.column-total' }
] as const satisfies readonly { key: keyof SalesFigures; title: string }[];

/**
 * Saves one currency's revenue table as a CSV, with the same labels the screen shows.
 *
 * @param currencyGroup - The group whose buckets to export.
 * @param labels - The bucket labels, in order.
 */
const downloadRevenue = (currencyGroup: SalesCurrency, labels: string[]) => {
    // js-toolkit `downloadBlob(data, filename, type)`: wraps the text in a Blob and clicks a link.
    downloadBlob(
        toCsv(
            [t('stats-page.column-period'), ...COLUMNS.map(({ title }) => t(title))],
            currencyGroup.buckets.map(({ figures }, index) => [
                labels[index],
                ...COLUMNS.map(({ key }) => figures[key])
            ])
        ),
        `revenue-${currencyGroup.currency}.csv`,
        'text/csv'
    );
};
</script>

<template>
    <section aria-labelledby="stats-sales-heading" data-test="stats-sales">
        <h2 id="stats-sales-heading" class="mb-3 text-xl font-semibold">
            {{ t('stats-page.heading-sales') }}
        </h2>

        <p v-if="!sales || groups.length === 0" class="mb-6 opacity-75" data-test="sales-empty">
            {{ t('stats-page.no-data') }}
        </p>

        <div v-for="{ group, cards, charts } in groups" :key="group.currency" class="mb-8">
            <h3 class="mb-2 text-base font-semibold" data-test="sales-currency">
                {{ group.currency }}
            </h3>
            <div class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-test="sales-cards">
                <CardMaterialStat
                    v-for="card in cards"
                    :key="card.key"
                    :title="card.title"
                    :value="card.value"
                    :subtitle="card.subtitle"
                    :data-test="`card-${card.key}`"
                />
            </div>

            <ChartWithTable
                :chart="charts.sales"
                kind="xy"
                :label-title="t('stats-page.column-period')"
                :file-name="`total-sales-${group.currency}`"
            />
            <ChartWithTable
                :chart="charts.orders"
                kind="xy"
                :label-title="t('stats-page.column-period')"
                :file-name="`orders-${group.currency}`"
            />

            <div class="mb-2 flex flex-wrap items-center gap-2">
                <h3 class="text-base font-semibold">{{ t('stats-page.revenue-title') }}</h3>
                <v-spacer />
                <v-btn
                    size="small"
                    variant="tonal"
                    data-test="revenue-csv"
                    @click="downloadRevenue(group, charts.sales.labels)"
                >
                    <Download :size="16" class="mr-1" aria-hidden="true" />
                    {{ t('stats-page.download-csv') }}
                </v-btn>
            </div>
            <v-table
                v-focusable-scroll="t('stats-page.revenue-title')"
                density="compact"
                data-test="revenue-table"
            >
                <caption class="sr-only">
                    {{
                        t('stats-page.revenue-title')
                    }}
                </caption>
                <thead>
                    <tr>
                        <th scope="col">{{ t('stats-page.column-period') }}</th>
                        <th v-for="column in COLUMNS" :key="column.key" scope="col">
                            {{ t(column.title) }}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(bucket, index) in group.buckets" :key="bucket.start">
                        <th scope="row">{{ charts.sales.labels[index] }}</th>
                        <td v-for="column in COLUMNS" :key="column.key">
                            {{
                                column.key === 'orders'
                                    ? bucket.figures.orders
                                    : formatCurrency(bucket.figures[column.key], group.currency)
                            }}
                        </td>
                    </tr>
                </tbody>
            </v-table>
        </div>

        <p class="mb-8 text-sm opacity-75" data-test="sales-note">
            {{ t('stats-page.note-sales') }}
        </p>
    </section>
</template>
