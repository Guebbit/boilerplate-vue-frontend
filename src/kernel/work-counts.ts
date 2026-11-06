/**
 * @module
 * The staff nav badges' open-work counts, held here so the screens that wear a badge can read them
 * without importing the module that fills them.
 *
 * One writer (`shop-tasks`, from `GET /shop-tasks/summary`), many readers (the manifests of the
 * modules that own the five screens). The key names are the contract's `ShopWorkSummary` keys, so
 * the kernel names no shop code of its own. A key the caller may not open is simply absent.
 */
import { computed, ref } from 'vue';
import type { ComputedRef } from 'vue';
import type { ShopWorkSummary } from '@types';

/**
 * The last summary read, module-level so the readers and the writer share it.
 */
const counts = ref<ShopWorkSummary>({});

/**
 * One screen's count, reactive.
 *
 * @param key - A `ShopWorkSummary` key, e.g. `salesOrders`.
 * @returns The count, or `undefined` while nothing is read or the caller may not open that screen.
 */
export const useWorkCount = (key: keyof ShopWorkSummary): ComputedRef<number | undefined> =>
    computed(() => counts.value[key]);

/**
 * Replace every count with the latest summary.
 *
 * @param next - The summary the server answered.
 */
export const setWorkCounts = (next: ShopWorkSummary): void => {
    counts.value = next;
};

/**
 * Forget every count: the person who read them is gone.
 */
export const clearWorkCounts = (): void => {
    counts.value = {};
};
