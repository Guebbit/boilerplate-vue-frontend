/**
 * Typed factories for a stock-board row and a preorder level, proven against the generated
 * response schema as every factory in `tests/support/unit/fixtures.ts` is.
 */
import { GetInventoryLevelResponse, ListPreorderLevelsResponse } from '@api/schemas';
import { contractBody } from '../../../../tests/support/unit/orval-fixture-schema.ts';
import type { InventoryLevel, PreorderLevel } from '@types';

/**
 * A valid stock-board row — some on the shelf, nothing backordered, preordering closed.
 *
 * @param overrides - the fields a case actually cares about
 * @returns an `InventoryLevel` that parses against the generated schema
 */
export const aLevel = (overrides: Partial<InventoryLevel> = {}): InventoryLevel =>
    contractBody<InventoryLevel>(GetInventoryLevelResponse, {
        productId: 'p1',
        title: 'Walnut desk',
        onHand: 10,
        reserved: 2,
        available: 8,
        backorderLimit: 0,
        backordered: 0,
        ...overrides
    });

/**
 * A valid preorder allowance row — a limit of ten, four outstanding (one unpaid, three paid).
 *
 * @param overrides - the fields a case actually cares about
 * @returns a `PreorderLevel` that parses against the generated schema
 */
export const aPreorderLevel = (overrides: Partial<PreorderLevel> = {}): PreorderLevel =>
    contractBody<PreorderLevel>(ListPreorderLevelsResponse.shape.items.element, {
        productId: 'p1',
        title: 'Walnut desk',
        releaseDate: '2027-03-15',
        backorderLimit: 10,
        backordered: 4,
        held: 1,
        paid: 3,
        left: 6,
        ordered: 7,
        ...overrides
    });
