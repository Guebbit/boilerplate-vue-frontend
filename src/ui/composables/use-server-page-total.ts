/**
 * @module
 * A `pageTotal` driven by the server's own `meta.totalPages`, for a store whose `search:` calls a
 * real paginated endpoint. `@guebbit/vue-toolkit`'s own `pageTotal` counts the LOCAL item
 * dictionary — correct only once every record already sits in memory, which a server-paginated
 * search never does; `locales/store.ts` hit this first (a French search reporting a second, empty
 * page because the dictionary still held Spanish's rows too) and fixed it the same way this
 * generalizes. The toolkit says as much of itself: `useStructureSearchApi`'s own comment reads
 * "the server-reported total...is not this composable's concern...read it out of your own apiCall
 * response and keep it in your own state" — this is that state, shared so every server-paginated
 * store keeps it the same way.
 */
import { ref, type Ref } from 'vue';

/**
 * @returns `pageTotal` to render in place of the toolkit's own, and `captureTotal` to call from
 * `search:`'s response handler with the response's `meta.totalPages`
 */
export const useServerPageTotal = (): {
    pageTotal: Ref<number>;
    captureTotal: (totalPages: number) => void;
} => {
    const pageTotal = ref(0);

    return {
        pageTotal,
        captureTotal: (value: number) => {
            pageTotal.value = value;
        }
    };
};
