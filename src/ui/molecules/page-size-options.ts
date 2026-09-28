/**
 * @module
 * The default row counts `PageSizeSelect.vue` offers — its own file because `<script setup>`
 * cannot carry a runtime named export a caller might want independently of the component.
 */

/**
 * Row counts every list in this app offers unless a caller needs its own — admin's audit log
 * passes a larger set instead of this default.
 */
export const DEFAULT_PAGE_SIZES = [10, 25, 50];
