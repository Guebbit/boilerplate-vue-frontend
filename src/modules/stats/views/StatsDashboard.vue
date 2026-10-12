<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'StatsDashboardPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The sales dashboard: one period form over four blocks. The page owns the period and the single
 * `loadDashboard` call; the blocks only render what the store holds. The stats route is the only
 * place Mermaid is imported, and only when a chart mounts.
 */
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useStatsStore } from '../store.ts';
import { periodFromQuery } from '../domain';
import type { StatsPeriodChoice } from '../domain';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import StatsPeriodForm from '../components/StatsPeriodForm.vue';
import SalesSection from '../components/SalesSection.vue';
import ProductsSection from '../components/ProductsSection.vue';
import OperationsSection from '../components/OperationsSection.vue';

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * The store and its last answers.
 */
const stats = useStatsStore();

/**
 * Every block's data, as refs.
 */
const { sales, products, categories, paymentMix, operations, customers, pipeline, loading } =
    storeToRefs(stats);

/**
 * The period the blocks currently show.
 */
const period = ref<StatsPeriodChoice>(periodFromQuery(useRoute().query, new Date()));

/**
 * The load's own blocked state: the page is unusable without its numbers, so a failure is one
 * alert above the blocks rather than a toast that fades.
 */
const { message: loadError, report: reportLoadError, clear: clearLoadError } = useBlockingError();

/**
 * Loads every block for the current period.
 *
 * @returns A promise settling once the blocks have answered or the failure is shown.
 */
const load = () => {
    clearLoadError();
    return stats.loadDashboard(period.value).catch((error: unknown) => reportLoadError(error));
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

onMounted(() => {
    void load();
});
</script>

<template>
    <div id="stats-dashboard-page">
        <StatsPeriodForm :model-value="period" @apply="applyPeriod" />

        <InlineErrorAlert :message="loadError" class="mb-4" data-test="stats-load-error" />

        <p v-if="sales" class="mb-4 text-sm opacity-75" data-test="stats-time-zone">
            {{ t('stats-page.label-time-zone', { timeZone: sales.period.timeZone }) }}
        </p>
        <v-progress-linear v-if="loading" indeterminate class="mb-4" />

        <SalesSection :sales="sales" />
        <ProductsSection :products="products" :categories="categories" :period="period" />
        <OperationsSection
            :payment-mix="paymentMix"
            :operations="operations"
            :customers="customers"
            :pipeline="pipeline"
        />
        <p class="mb-8 text-sm opacity-75" data-test="stats-limits">
            {{ t('stats-page.note-limits') }}
        </p>
    </div>
</template>
