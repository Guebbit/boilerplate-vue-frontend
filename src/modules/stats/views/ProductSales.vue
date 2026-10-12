<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'ProductSalesPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * One product's sales over time: units ordered and reversed per bucket, plus a link to the orders
 * behind them (the staff orders list, filtered by product and by paid date). The period arrives in
 * the URL from the dashboard, or defaults to the last 30 days.
 */
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { linkIfRouted } from '@/kernel/route-link.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { useStatsStore } from '../store.ts';
import { bucketLabel, periodFromQuery } from '../domain';
import type { ChartModel, StatsPeriodChoice } from '../domain';
import StatsPeriodForm from '../components/StatsPeriodForm.vue';
import ChartWithTable from '../components/ChartWithTable.vue';

/**
 * The product, from the route.
 */
const props = defineProps<{
    /** The product id in the path. */
    productId: string;
}>();

/**
 * Translation function and locale.
 */
const { t, locale } = useI18n();

/**
 * Router and current route, for the period in the query and the orders link.
 */
const router = useRouter();

/**
 * The current route, whose query carries the period.
 */
const route = useRoute();

/**
 * The store and its last series.
 */
const stats = useStatsStore();

/**
 * The series answer.
 */
const { productSeries } = storeToRefs(stats);

/**
 * The period shown.
 */
const period = ref<StatsPeriodChoice>(periodFromQuery(route.query, new Date()));

/**
 * The load's own blocked state.
 */
const { message: loadError, report: reportLoadError, clear: clearLoadError } = useBlockingError();

/**
 * Loads the series for the current period and keeps the URL in step, so a reload or a shared link
 * shows the same question.
 *
 * @returns A promise settling once the series answered or the failure is shown.
 */
const load = () => {
    clearLoadError();
    void router.replace({ query: { ...period.value } });
    return stats
        .loadProductSales(props.productId, period.value)
        .catch((error: unknown) => reportLoadError(error));
};

/**
 * Applies a new period and reloads.
 *
 * @param next - The period the form accepted.
 */
const applyPeriod = (next: StatsPeriodChoice) => {
    period.value = next;
    void load();
};

/**
 * The product's name as the orders froze it, or its id when it sold nothing in the period.
 */
const productTitle = computed(() => productSeries.value?.title ?? props.productId);

/**
 * Units per bucket, ordered as bars and reversed as a line.
 */
const chart = computed<ChartModel>(() => {
    const series = productSeries.value;
    const buckets = series?.buckets ?? [];
    const labels = buckets.map(({ start }) =>
        bucketLabel(
            start,
            series?.period.timeZone ?? 'UTC',
            series?.period.interval ?? period.value.interval,
            locale.value
        )
    );
    return {
        title: t('stats-page.product-chart-title', { title: productTitle.value }),
        labels,
        yTitle: t('stats-page.series-units'),
        series: [
            {
                name: t('stats-page.series-ordered'),
                kind: 'bar',
                values: buckets.map(({ unitsOrdered }) => unitsOrdered)
            },
            {
                name: t('stats-page.series-reversed'),
                kind: 'line',
                values: buckets.map(({ unitsReversed }) => unitsReversed)
            }
        ]
    };
});

/**
 * Whether the product sold nothing in the period.
 */
const soldNothing = computed(() =>
    productSeries.value?.buckets.every(
        ({ unitsOrdered, unitsReversed }) => unitsOrdered === 0 && unitsReversed === 0
    )
);

/**
 * The staff orders list, narrowed to this product and the days shown; `undefined` when this build
 * ships no orders module.
 */
const ordersLink = computed(() => {
    const target = linkIfRouted(router, 'SalesOrders', undefined, {
        productId: props.productId,
        paidFrom: period.value.from,
        paidTo: period.value.to
    });
    return target ? routerLinkI18n(target) : undefined;
});

onMounted(() => {
    void load();
});
</script>

<template>
    <div id="stats-product-sales-page">
        <div class="mb-4 flex flex-wrap items-center gap-3">
            <router-link
                :to="routerLinkI18n({ name: 'StatsDashboard', query: { ...period } })"
                class="underline"
                data-test="back-to-dashboard"
            >
                {{ t('stats-page.back-to-dashboard') }}
            </router-link>
            <h2 class="text-xl font-semibold" data-test="product-title">{{ productTitle }}</h2>
            <v-spacer />
            <v-btn v-if="ordersLink" :to="ordersLink" variant="tonal" data-test="view-orders">
                {{ t('stats-page.button-view-orders') }}
            </v-btn>
        </div>

        <StatsPeriodForm :model-value="period" @apply="applyPeriod" />

        <InlineErrorAlert :message="loadError" class="mb-4" data-test="stats-load-error" />

        <p v-if="soldNothing" class="mb-4 opacity-75" data-test="sold-nothing">
            {{ t('stats-page.product-sold-nothing') }}
        </p>
        <ChartWithTable
            :chart="chart"
            kind="xy"
            :label-title="t('stats-page.column-period')"
            :file-name="`product-${productId}`"
        />
        <p class="mb-8 text-sm opacity-75">{{ t('stats-page.note-product-sales') }}</p>
    </div>
</template>
