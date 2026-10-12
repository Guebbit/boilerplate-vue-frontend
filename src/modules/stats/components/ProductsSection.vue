<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'ProductsSection'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Top products and sales by category. A product row links to its own sales page, carrying the
 * period along; the category pie and table say outright that a product in two categories counts
 * in both, since the rows then do not add up to the total.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { vFocusableScroll } from '@/ui/directives/focusable-scroll';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { formatCurrency } from '@/infrastructure/utils/formatters.ts';
import type { CategoryStats, ProductStats } from '@types';
import type { ChartModel, StatsPeriodChoice } from '../domain';
import ChartWithTable from './ChartWithTable.vue';

/**
 * The two answers and the period they cover.
 */
const props = defineProps<{
    /** `GET /stats/products`. */
    products?: ProductStats;
    /** `GET /stats/categories`. */
    categories?: CategoryStats;
    /** The period, passed on to a product's own page. */
    period: StatsPeriodChoice;
}>();

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * A product's sales page, for the same days.
 *
 * @param productId - The product.
 * @returns A locale-aware location carrying the period as a query.
 */
const productLink = (productId: string) =>
    routerLinkI18n({
        name: 'StatsProductSales',
        params: { productId },
        query: { from: props.period.from, to: props.period.to, interval: props.period.interval }
    });

/**
 * One pie per currency: the API groups money by currency, and slices of two currencies do not
 * share a whole.
 */
const categoryCharts = computed(() => {
    const rows = props.categories?.categories ?? [];
    return [...new Set(rows.map(({ currency }) => currency))].map((currency): ChartModel => {
        const own = rows.filter((row) => row.currency === currency);
        return {
            title: t('stats-page.categories-title', { currency }),
            labels: own.map(({ category }) => category),
            series: [
                {
                    name: t('stats-page.column-net-sales'),
                    kind: 'bar',
                    values: own.map(({ netSales }) => netSales)
                }
            ]
        };
    });
});
</script>

<template>
    <section aria-labelledby="stats-products-heading" data-test="stats-products">
        <h2 id="stats-products-heading" class="mb-3 text-xl font-semibold">
            {{ t('stats-page.heading-products') }}
        </h2>

        <p
            v-if="!products || products.products.length === 0"
            class="mb-6 opacity-75"
            data-test="products-empty"
        >
            {{ t('stats-page.no-data') }}
        </p>
        <v-table
            v-else
            v-focusable-scroll="t('stats-page.products-title')"
            class="mb-2"
            density="compact"
            data-test="products-table"
        >
            <caption class="sr-only">
                {{
                    t('stats-page.products-title')
                }}
            </caption>
            <thead>
                <tr>
                    <th scope="col">{{ t('stats-page.column-product') }}</th>
                    <th scope="col">{{ t('stats-page.column-ordered') }}</th>
                    <th scope="col">{{ t('stats-page.column-reversed') }}</th>
                    <th scope="col">{{ t('stats-page.column-net-units') }}</th>
                    <th scope="col">{{ t('stats-page.column-net-sales') }}</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="row in products.products" :key="`${row.productId}-${row.currency}`">
                    <th scope="row">
                        <router-link
                            :to="productLink(row.productId)"
                            class="underline"
                            data-test="product-link"
                        >
                            {{ row.title }}
                        </router-link>
                    </th>
                    <td>{{ row.unitsOrdered }}</td>
                    <td>{{ row.unitsReversed }}</td>
                    <td>{{ row.netUnits }}</td>
                    <td>{{ formatCurrency(row.netSales, row.currency) }}</td>
                </tr>
            </tbody>
        </v-table>
        <p class="mb-8 text-sm opacity-75">{{ t('stats-page.note-products') }}</p>

        <ChartWithTable
            v-for="chart in categoryCharts"
            :key="chart.title"
            :chart="chart"
            kind="pie"
            :label-title="t('stats-page.column-category')"
            file-name="categories"
        />
        <p v-if="categoryCharts.length > 0" class="mb-8 text-sm opacity-75">
            {{ t('stats-page.note-categories') }}
        </p>
    </section>
</template>
