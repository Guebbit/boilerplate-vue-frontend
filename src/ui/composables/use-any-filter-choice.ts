/**
 * @module
 * The `v-select` ⇄ store mapping every "All / Any" admin filter needs.
 *
 * Vuetify falls back to an item's TITLE as its VALUE whenever `item-value` resolves to
 * `undefined` (`getObjectValueByPath`, `node_modules/vuetify/lib/util/helpers.js:20`), so an
 * "any status" item written as `{ value: undefined, title: '…' }` posts the translated label to
 * the API once picked. The same lookup returns `null` unchanged, so every filter's "any" item
 * uses `value: null` instead — and this composable owns mapping that sentinel back to the
 * `undefined` the store's filters object actually carries, the one place that ⇄ mapping lives
 * rather than eleven hand-copies of it.
 */
import { computed, type WritableComputedRef } from 'vue';

/**
 * Wraps a `T | undefined` filter field for direct `v-model` binding: `null` on screen (the "any"
 * item's value), `undefined` in the filters object a search request is built from.
 *
 * @param get - Reads the filter field's current value.
 * @param set - Writes a new value back onto the filters object.
 * @returns A computed a `v-select` can `v-model` straight onto.
 */
export const useAnyFilterChoice = <T>(
    get: () => T | undefined,
    set: (value: T | undefined) => void
): WritableComputedRef<T | null> =>
    computed({
        get: () => get() ?? null,
        set: (choice) => set(choice ?? undefined)
    });
