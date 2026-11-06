/**
 * The shop summary as `GET /shop-tasks/summary` answers it, parsed through the generated schema so
 * a fixture that drifts from the contract fails here, not in a screen.
 */
import { GetShopWorkSummaryResponse } from '@api/schemas';
import type { ShopWorkSummary } from '@types';

/**
 * A valid summary: every count present unless the test says otherwise.
 *
 * @param overrides - The counts the test cares about.
 * @returns A `ShopWorkSummary` that parses against the contract.
 */
export const aSummary = (overrides: ShopWorkSummary = {}): ShopWorkSummary =>
    GetShopWorkSummaryResponse.parse({
        salesOrders: 4,
        salesPayments: 3,
        returns: 2,
        salesPreorders: 1,
        inventory: 5,
        ...overrides
    });
