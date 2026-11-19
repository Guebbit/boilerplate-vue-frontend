/**
 * @module
 * Search-as-you-type account options for the "New order" buyer picker. Backed by
 * `POST /users/search`, debounced like `inventory`'s product picker, and only ever started by a
 * viewer who may read users: it fires nothing until `search` is called.
 */
import { ref } from 'vue';
import { debounce } from 'lodash-es';
import { searchUsers } from '@api';

/** One `v-autocomplete` item: the id the API expects, what a person reads. */
export interface AccountOption {
    value: string;
    title: string;
}

/** How many rows one search page returns: a picker, not a user list. */
const PAGE_SIZE = 20;

/** How long to hold off after a keystroke before searching. */
const DEBOUNCE_MS = 300;

/**
 * An account picker's search box and options list.
 *
 * @returns `query` (bind to `v-autocomplete`'s `search`), `options` (bind to `:items`) and `search`
 *  (call with each typed text).
 */
export const useAccountPicker = () => {
    /** The text currently typed into the picker. */
    const query = ref('');

    /** The accounts the last search found. */
    const options = ref<AccountOption[]>([]);

    /**
     * Runs the search, debounced so a fast typist does not fire one request per key. A failed
     * search leaves the previous options showing: the picker has no error slot, and the order's
     * own submit surfaces a real problem.
     * https://lodash.com/docs/#debounce (the second argument is the wait, in ms)
     */
    const runSearch = debounce((text: string) => {
        searchUsers({ text: text || undefined, pageSize: PAGE_SIZE })
            .then((response) => {
                options.value = response.items.map((user) => ({
                    value: user.id,
                    title: `${user.username} (${user.email})`
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

    return { query, options, search };
};
