/**
 * @module
 * The stats pages' failure and empty rows, run through the shared `actionTable` runner: a
 * dashboard or product page whose numbers cannot be read says so in one alert and recovers on
 * reload, and a period with no sales shows its empty copy instead of a blank table.
 */
import { actionTable } from '../../../../../tests/support/e2e/action-table';
import {
    GetProductStatsResponse,
    GetSalesStatsResponse
} from '../../../../../contracts/rest/schemas.zod';

/** The period an empty answer reports: a day with nothing in it. */
const EMPTY_PERIOD = { from: '2026-01-01', to: '2026-01-01', interval: 'day', timeZone: 'UTC' };

actionTable('stats', [
    {
        name: 'a dashboard whose sales cannot be read shows one alert and recovers on reload',
        persona: 'manager',
        route: '/en/sales/stats',
        intercept: { method: 'GET', url: '**/stats/sales*', operation: '/stats/sales' },
        kind: 'read',
        alert: 'stats-load-error'
    },
    {
        name: 'a product page whose series cannot be read shows one alert and recovers on reload',
        persona: 'manager',
        route: () => cy.subjectId('product.rich').then((id) => `/en/sales/stats/products/${id}`),
        intercept: {
            method: 'GET',
            url: '**/stats/products/*',
            operation: '/stats/products/{productId}'
        },
        kind: 'read',
        alert: 'stats-load-error'
    },
    {
        name: 'a period with no sales shows the empty copy and no currency block',
        persona: 'manager',
        route: '/en/sales/stats',
        intercept: { method: 'GET', url: '**/stats/sales*', operation: '/stats/sales' },
        kind: 'empty',
        emptyBody: {
            success: true,
            status: 200,
            message: 'OK',
            data: { period: EMPTY_PERIOD, currencies: [] }
        },
        emptySchema: GetSalesStatsResponse,
        empty: { copy: '[data-test=sales-empty]', rows: '[data-test=sales-currency]' }
    },
    {
        name: 'a period with no products sold shows the empty copy and no table',
        persona: 'manager',
        route: '/en/sales/stats',
        intercept: { method: 'GET', url: '**/stats/products*', operation: '/stats/products' },
        kind: 'empty',
        emptyBody: {
            success: true,
            status: 200,
            message: 'OK',
            data: { period: EMPTY_PERIOD, products: [] }
        },
        emptySchema: GetProductStatsResponse,
        empty: { copy: '[data-test=products-empty]', rows: '[data-test=products-table]' }
    }
]);
