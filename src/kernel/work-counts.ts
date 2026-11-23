/**
 * @module
 * The staff nav badges' open-work counts, held here so the screens that wear a badge can read them
 * without importing the module that fills them.
 *
 * One writer (`shop-tasks`, from `GET /shop-tasks/summary`), many readers (the manifests of the
 * modules that own the screens). The keys are whatever the writer's summary names, so the kernel
 * names no shop code of its own. A key the caller may not open is simply absent.
 */
import { computed, ref } from 'vue';
import type { ComputedRef } from 'vue';

/**
 * A summary of open work: a count per screen key; a key the caller may not open is absent.
 */
export type WorkCounts = Readonly<Record<string, number | undefined>>;

/**
 * The last summary read, module-level so the readers and the writer share it.
 */
const counts = ref<WorkCounts>({});

/**
 * One screen's count, reactive.
 *
 * @param key - A key of the writer's summary, e.g. `salesOrders`.
 * @returns The count, or `undefined` while nothing is read or the caller may not open that screen.
 */
export const useWorkCount = (key: string): ComputedRef<number | undefined> =>
    computed(() => counts.value[key]);

/**
 * Replace every count with the latest summary.
 *
 * @param next - The summary the server answered.
 */
export const setWorkCounts = (next: WorkCounts): void => {
    counts.value = next;
};

/**
 * Forget every count: the person who read them is gone.
 */
export const clearWorkCounts = (): void => {
    counts.value = {};
};
