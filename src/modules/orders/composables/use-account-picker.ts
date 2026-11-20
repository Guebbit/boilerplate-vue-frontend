/**
 * @module
 * Search-as-you-type account options for the "New order" buyer picker. Backed by
 * `POST /users/search`, debounced like `inventory`'s product picker, and only ever started by a
 * viewer who may read users: it fires nothing until `search` is called.
 */
import { computed, ref } from 'vue';
import { debounce } from 'lodash-es';
import { searchUsers } from '@api';

/** One `v-autocomplete` item: the id the API expects, what a person reads. */
export interface AccountOption {
    value: string;
    title: string;
    /** The account's own address, used to prefill the order's email. */
    email: string;
}

/** How many rows one search page returns: a picker, not a user list. */
const PAGE_SIZE = 20;

/** How long to hold off after a keystroke before searching. */
const DEBOUNCE_MS = 300;

/**
 * An account picker's search box and options list.
 *
 * Vuetify writes the picked title into the search text, which re-searches and drops the picked
 * account from the results; `pick` pins it so the field keeps showing its title.
 *
 * @returns `query` (bind to `v-autocomplete`'s `search`), `options` (bind to `:items`), `search`
 *  (call with each typed text) and `pick` (call with the chosen id).
 */
export const useAccountPicker = () => {
    /** The text currently typed into the picker. */
    const query = ref('');

    /** The accounts the last search found. */
    const found = ref<AccountOption[]>([]);

    /** The picked account, kept while a later search no longer lists it. */
    const pinned = ref<AccountOption | undefined>();

    /** The found accounts, plus the pinned one when a search dropped it. */
    const options = computed(() =>
        pinned.value && found.value.every((option) => option.value !== pinned.value?.value)
            ? [pinned.value, ...found.value]
            : found.value
    );

    /**
     * Runs the search, debounced so a fast typist does not fire one request per key. A failed
     * search leaves the previous options showing: the picker has no error slot, and the order's
     * own submit surfaces a real problem.
     * https://lodash.com/docs/#debounce (the second argument is the wait, in ms)
     */
    const runSearch = debounce((text: string) => {
        searchUsers({ text: text || undefined, pageSize: PAGE_SIZE })
            .then((response) => {
                found.value = response.items.map((user) => ({
                    value: user.id,
                    title: `${user.username} (${user.email})`,
                    email: user.email
                }));
            })
            .catch(() => undefined);
    }, DEBOUNCE_MS);

    /**
     * Records what was typed and searches for it.
     *
     * @param text - The picker's current search text.
     */
    const search = (text: string) => {
        query.value = text;
        runSearch(text);
    };

    /**
     * Pins the chosen account so it stays listed.
     *
     * @param id - The picked account id; falsy clears the pin.
     * @returns The picked account's email, `undefined` when none.
     */
    const pick = (id: string | null | undefined) => {
        pinned.value = id ? options.value.find((option) => option.value === id) : undefined;
        return pinned.value?.email;
    };

    return { query, options, search, pick };
};
