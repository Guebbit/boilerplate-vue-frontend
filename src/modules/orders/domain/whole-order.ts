/**
 * @module
 * Told apart: a whole `Order` and the `OrderListItem` a list answers. The store caches both under
 * one id, so a page that needs the detail asks which one it holds.
 */
import type { Order, OrderListItem } from '@types';

/**
 * Whether a cached record is the whole order (it carries `items`) rather than a list row, which is
 * only a preview. A detail-only part waits for this.
 *
 * @param record - What the store holds under the id.
 * @returns `true` when the record is a whole `Order`.
 */
export const isWholeOrder = (record: Order | OrderListItem): record is Order => 'items' in record;
