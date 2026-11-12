/**
 * @module
 * Told apart: a whole `Return` and the `ReturnListItem` a list answers. The store caches both
 * under one id, so a page that needs the detail asks which one it holds.
 */
import type { Return, ReturnListItem } from '@types';

/**
 * Whether a cached record is the whole return (it carries `lines`) rather than a list row, which
 * is only a preview. A detail-only part waits for this.
 *
 * @param record - What the store holds under the id.
 * @returns `true` when the record is a whole `Return`.
 */
export const isWholeReturn = (record: Return | ReturnListItem): record is Return =>
    'lines' in record;
