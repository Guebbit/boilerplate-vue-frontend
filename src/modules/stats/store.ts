/**
 * @module
 * Pinia store for the stats domain. Every block of the dashboard is one read-only GET, held as the
 * last answer; `loadDashboard` fires them together for one period and `loadProductSales` reads one
 * product's series. Nothing is cached across periods: the API answers `no-store` on purpose, since
 * these are the shop's takings.
 */
import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useStructureRestApi } from '@guebbit/vue-toolkit';
import { queryClient } from '@/infrastructure/query-client.ts';
import {
    getCategoryStats,
    getCustomerStats,
    getOperationsStats,
    getPaymentMixStats,
    getPipelineStats,
    getProductSalesSeries,
    getProductStats,
    getSalesStats
} from '@api';
import type {
    CategoryStats,
    CustomerStats,
    OperationsStats,
    PaymentMix,
    PipelineStats,
    ProductSeries,
    ProductStats,
    SalesStats
} from '@types';
import type { StatsPeriodChoice } from './domain';

/**
 * How many products the "top products" block asks for.
 */
const TOP_PRODUCTS = 10;

/**
 * The sales dashboard's data and the product sales page's.
 *
 * Seven blocks, each the last answer to its endpoint, `undefined` until the first one lands. The
 * API groups money per currency and never converts, and so does this store: it holds what the
 * endpoint said and does no arithmetic, because a second implementation of "net sales" is a
 * second thing that can disagree with the invoices.
 */
export const useStatsStore = defineStore('stats', () => {
    /**
     * Shared loading flag plus the request runner every read below goes through.
     */
    const { loading, fetchAny } = useStructureRestApi<SalesStats, string>({
        resourceKey: 'stats',
        queryClient
    });

    /**
     * Headline totals, the previous period's, and the buckets over time.
     */
    const sales = ref<SalesStats>();

    /**
     * The best-selling products of the period.
     */
    const products = ref<ProductStats>();

    /**
     * Net sales per category.
     */
    const categories = ref<CategoryStats>();

    /**
     * The payments mix: method and provider.
     */
    const paymentMix = ref<PaymentMix>();

    /**
     * Cancellation, return and refund rates.
     */
    const operations = ref<OperationsStats>();

    /**
     * New versus returning customers.
     */
    const customers = ref<CustomerStats>();

    /**
     * What is waiting right now: transfers awaiting money, paid orders not yet shipped.
     */
    const pipeline = ref<PipelineStats>();

    /**
     * One product's units over time, for the drill-down page.
     */
    const productSeries = ref<ProductSeries>();

    /**
     * Loads every dashboard block for one period, together.
     *
     * @param period - The days and bucket size to ask about.
     * @returns A promise resolving once all seven reads answered; rejects with the first failure,
     *  and the blocks that did answer keep their new values.
     */
    const loadDashboard = (period: StatsPeriodChoice) => {
        const { from, to, interval } = period;
        return fetchAny(() =>
            Promise.all([
                getSalesStats({ from, to, interval }).then((response) => {
                    sales.value = response.data;
                }),
                getProductStats({ from, to, limit: TOP_PRODUCTS }).then((response) => {
                    products.value = response.data;
                }),
                getCategoryStats({ from, to }).then((response) => {
                    categories.value = response.data;
                }),
                getPaymentMixStats({ from, to }).then((response) => {
                    paymentMix.value = response.data;
                }),
                getOperationsStats({ from, to }).then((response) => {
                    operations.value = response.data;
                }),
                getCustomerStats({ from, to }).then((response) => {
                    customers.value = response.data;
                }),
                // A snapshot of now: the period does not apply to it.
                getPipelineStats().then((response) => {
                    pipeline.value = response.data;
                })
            ]).then(() => undefined)
        );
    };

    /**
     * Loads one product's sales series.
     *
     * @param productId - The product.
     * @param period - The days and bucket size to ask about.
     * @returns A promise resolving with the series.
     */
    const loadProductSales = (productId: string, period: StatsPeriodChoice) =>
        fetchAny(() =>
            getProductSalesSeries(productId, period).then((response) => {
                productSeries.value = response.data;
                return productSeries.value;
            })
        );

    return {
        loading,
        sales,
        products,
        categories,
        paymentMix,
        operations,
        customers,
        pipeline,
        productSeries,
        loadDashboard,
        loadProductSales
    };
});
