/**
 * @module
 * The Lighthouse case of the orders module: the staff data table. See
 * `docs/tools/lighthouse.md#cases-live-with-modules`.
 */
import type { LighthouseCase } from '../../../../tests/support/lighthouse/case';

/** The cases this module contributes. */
export const lighthouseCases: readonly LighthouseCase[] = [
    { name: 'orders/sales', route: '/en/sales/orders', persona: 'manager' }
];
