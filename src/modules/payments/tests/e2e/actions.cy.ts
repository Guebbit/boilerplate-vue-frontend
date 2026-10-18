/**
 * @module
 * The payments module's empty-state rows, run through the shared `actionTable` runner: each list read
 * is answered with a schema-checked empty page, and the screen must show its empty copy, no rows
 * and no pager.
 */
import { actionTable } from '../../../../../tests/support/e2e/action-table';
import {
    ListPaymentAttentionResponse,
    ListPaymentsResponse,
    ListRefundsResponse,
    SearchPaymentsResponse
} from '../../../../../contracts/rest/schemas.zod';

/** An empty page, as the paged list reads answer it. */
const emptyPage = {
    success: true,
    status: 200,
    message: 'OK',
    data: { items: [], meta: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } }
};

actionTable('payments', [
    {
        name: 'the All tab with no payments shows its empty state',
        persona: 'admin',
        route: '/en/sales/payments?tab=all',
        intercept: { method: 'POST', url: '**/payments/search', operation: '/payments/search' },
        kind: 'empty',
        emptyBody: emptyPage,
        emptySchema: SearchPaymentsResponse,
        empty: { copy: '.v-empty-state', rows: '[data-test=list-row]' }
    },
    {
        name: 'the Awaiting tab with nothing owed shows its empty state',
        persona: 'admin',
        route: '/en/sales/payments?tab=awaiting',
        intercept: { method: 'GET', url: '**/payments?*', operation: '/payments' },
        kind: 'empty',
        emptyBody: emptyPage,
        emptySchema: ListPaymentsResponse,
        empty: { copy: '.v-empty-state', rows: '[data-test=list-row]' }
    },
    {
        name: 'the Refunds tab with no refunds shows its empty state',
        persona: 'admin',
        route: '/en/sales/payments?tab=refunds',
        intercept: { method: 'GET', url: '**/payments/refunds?*', operation: '/payments/refunds' },
        kind: 'empty',
        emptyBody: emptyPage,
        emptySchema: ListRefundsResponse,
        empty: { copy: '.v-empty-state', rows: '[data-test=list-row]' }
    },
    {
        name: 'the Attention tab with nothing to look at shows its empty state',
        persona: 'admin',
        route: '/en/sales/payments?tab=attention',
        intercept: {
            method: 'GET',
            url: '**/payments/attention',
            operation: '/payments/attention'
        },
        kind: 'empty',
        emptyBody: { ...emptyPage, data: { items: [] } },
        emptySchema: ListPaymentAttentionResponse,
        empty: { copy: '.v-empty-state', rows: '[data-test=list-row]' }
    }
]);
