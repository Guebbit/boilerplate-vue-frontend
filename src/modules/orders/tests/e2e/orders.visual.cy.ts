/**
 * @module
 * Cypress visual-regression route list for the orders module, run through the shared
 * `sweepVisual` helper.
 *
 * Not part of `npm run complete`: run with `npm run test:e2e:visual`, and re-record with
 * `npm run test:e2e:visual:update` only after LOOKING at the diff image.
 */
import { sweepVisual } from '../../../../../tests/support/e2e/visual-sweep';

sweepVisual(
    'orders',
    [
        {
            name: 'orders-list',
            route: '/en/orders',
            readySelector: '#orders-list-page',
            // The demo's orders are produced at boot: fresh ids, and dates relative to today.
            redact: [
                '#orders-list-page tbody td:nth-child(1)',
                '#orders-list-page tbody td:nth-child(5)',
                '#orders-list-page tbody td:nth-child(6)'
            ]
        },
        {
            // The page after checkout: payment panel and transfer instructions.
            name: 'order, awaiting transfer',
            route: () => cy.subjectId('order.awaitingTransfer').then((id) => `/en/orders/${id}`),
            readySelector: '#order-target',
            viewports: ['phone'],
            redact: ['[data-test=order-number]']
        }
    ],
    'user'
);
