/**
 * @module
 * Each staff nav entry that wears an open-work count reads its own key of the shop summary, and no
 * other: the five screens that come from `GET /shop-tasks/summary`.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { collectModuleNavigation } from '@/kernel/registry.ts';
import { clearWorkCounts, setWorkCounts } from '@/kernel/work-counts.ts';
import { enabledModules } from '@/modules';
import { aSummary } from '../../../src/modules/shop-tasks/tests/summary-fixtures.ts';

afterEach(clearWorkCounts);

/**
 * Entry name to the summary key it must wear.
 */
const WEARS = {
    SalesOrders: 'salesOrders',
    PaymentsList: 'salesPayments',
    SalesReturns: 'returns',
    PreordersBoard: 'salesPreorders',
    InventoryLedger: 'inventory'
} as const;

describe('the staff nav badges that read the shop summary', () => {
    it.each(Object.entries(WEARS))('%s wears the summary key %s', (name, key) => {
        const counts = aSummary();
        setWorkCounts({ ...counts });
        const entry = collectModuleNavigation(enabledModules).find((one) => one.name === name);

        expect(entry?.badge?.().value).toBe(counts[key]);
    });

    it('wears the next count after the summary is read again', () => {
        const entry = collectModuleNavigation(enabledModules).find(
            ({ name }) => name === 'SalesOrders'
        );
        const badge = entry?.badge?.();

        setWorkCounts({ ...aSummary({ salesOrders: 9 }) });

        expect(badge?.value).toBe(9);
    });
});
