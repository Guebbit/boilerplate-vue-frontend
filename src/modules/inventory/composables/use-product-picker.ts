/**
 * @module
 * Search-as-you-type product options for an inventory picker (`StockMovementForm`,
 * `MovementLedger`). Backed by `POST /products/search` rather than the products store's own
 * unpaged `listProducts()` cache, which only ever holds the first page — past roughly ten
 * products, anything later was simply unreachable from a `v-select` built off it.
 */
import { ref, computed, watch } from 'vue';
import { debounce } from 'lodash-es';
import { searchProducts } from '@api';
import type { Product } from '@types';

/** One `v-autocomplete` item: the id the API expects, the title a person reads. */
export interface ProductPickerOption {
    value: string;
    title: string;
}

/** How many rows one search page returns — a picker, not a catalogue browse. */
const PAGE_SIZE = 20;

/** How long to hold off after a keystroke before searching. */
const DEBOUNCE_MS = 300;

/**
 * A product picker's search box and options list.
 *
 * `pin(id)` is the other half of the fix: a selection that did not come from typing (an id handed
 * in from elsewhere, e.g. `StockBoard`'s history button) is not necessarily among the current
 * search results, and a `v-autocomplete` with a `v-model` value absent from its own `items` shows
 * nothing readable. Call it with whatever the bound `v-model` currently holds — including
 * `undefined` — and it fetches that one product by id when needed, once, and keeps it in the list
 * until a fresher pin replaces it.
 *
 * @returns `query` (bind to `v-autocomplete`'s `search`), `options` (bind to `:items`) and `pin`.
 */
export const useProductPicker = () => {
    /** The text currently typed into the picker. */
    const query = ref('');

    /** The current search page — every product the search box matched. */
    const results = ref<Product[]>([]);

    /** The one product fetched by id for `pin()`, kept only while it is not already in `results`. */
    const pinned = ref<Product | undefined>();

    /**
     * Runs the search itself, debounced so a fast typist does not fire one request per keystroke.
     */
    const runSearch = debounce((text: string) => {
        searchProducts({ text: text || undefined, pageSize: PAGE_SIZE })
            .then((response) => {
                results.value = response.data.items;
            })
            // A failed search just leaves the previous page showing — the picker has no error
            // slot of its own, and the caller's own submit will surface a real problem anyway.
            .catch(() => undefined);
    }, DEBOUNCE_MS);

    // Vue `watch(source, callback, { immediate })`: `immediate` runs the first search as soon
    // as the picker is created, with the initial query.
    watch(query, (text) => runSearch(text), { immediate: true });

    /**
     * The options offered to the picker: the current search page, plus the pinned product when it
     * would otherwise be missing from it.
     */
    const options = computed<ProductPickerOption[]>(() => {
        const products =
            pinned.value && !results.value.some((product) => product.id === pinned.value?.id)
                ? [pinned.value, ...results.value]
                : results.value;
        return products.map((product) => ({ value: product.id, title: product.title }));
    });

    /**
     * Ensures one already-selected product stays displayable, fetching it by id when the current
     * search page does not already carry it.
     *
     * @param id - The `v-model` value to keep resolvable; a falsy one just clears the pin.
     */
    const pin = (id: string | undefined) => {
        if (!id || results.value.some((product) => product.id === id)) {
            pinned.value = undefined;
            return;
        }
        if (pinned.value?.id === id) return;
        searchProducts({ id: [id], pageSize: 1 })
            .then((response) => {
                pinned.value = response.data.items[0];
            })
            // A product that no longer exists (deleted since it was selected) just stays
            // unresolved — the bound id is still whatever the caller's form holds either way.
            .catch(() => undefined);
    };

    return { query, options, pin };
};

/**
 * Keeps a picker's pin in step with whatever a `v-model` currently holds — the common case, wired
 * once at the call site instead of a manual `watch` at each one.
 *
 * @param getSelected - Reads the bound product id; a getter, so a `computed`-free `() =>
 *  form.value.productId` works as well as a plain ref.
 * @param pin - {@link useProductPicker}'s own `pin`.
 */
export const useProductPickerPin = (
    getSelected: () => string | undefined,
    pin: (id: string | undefined) => void
) => watch(getSelected, pin, { immediate: true });
