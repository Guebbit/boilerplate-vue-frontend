/**
 * @module
 * Pinia store (Composition API form) wrapping `useStructureRestApi` for the address book: every
 * write re-fetches the whole book rather than patching one entry, because the invariant worth
 * rendering — exactly one default — is a property of the list, and a write that moves it changes a
 * row other than the one the API answered with.
 */
import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useStructureRestApi } from '@guebbit/vue-toolkit';
import { queryClient } from '@/infrastructure/query-client.ts';
import {
    getAddresses as apiGetAddresses,
    addAddress as apiAddAddress,
    updateAddress as apiUpdateAddress,
    setDefaultAddress as apiSetDefaultAddress,
    removeAddress as apiRemoveAddress
} from '@api';
import { getPayloadFromResponse } from '@/infrastructure/http/envelope.ts';
import type {
    Address,
    AddressesEnvelope,
    AddressesResponse,
    AddressInput,
    UpdateAddressRequest
} from '@types';

/**
 * The visitor's address book. Scoped to `ProfileAddresses.vue`, the only component that renders
 * it — a book is a property of the profile page, not of the session or the editable record.
 */
export const useAddressesStore = defineStore('accountAddresses', () => {
    /**
     * The toolkit's REST slice for this store: the loading flag and the `fetchAny` wrapper
     * every action below goes through.
     */
    const { loading, fetchAny } = useStructureRestApi<Address, string>({
        resourceKey: 'accountAddresses',
        queryClient
    });

    /**
     * The visitor's address book. Whole-list state, for the same reason `sessions` is in its own
     * store — the invariant worth rendering after any write is "exactly one default", which is a
     * property of the list.
     */
    const addresses = ref<Address[]>([]);

    /**
     * Replace the local book with the payload the book's own endpoints answer with (the read and
     * the delete).
     *
     * Typed as the generated envelope rather than `unknown`, so the call sites are checked against
     * the contract instead of being waved through a cast: the day an endpoint stops answering with
     * the address book, this stops compiling.
     */
    const readAddressesResponse = (data: AddressesEnvelope) => {
        const payload = getPayloadFromResponse<AddressesResponse>(data);
        addresses.value = payload?.addresses ?? [];
        return addresses.value;
    };

    /**
     * Loads the address book.
     *
     * @returns A promise resolving with the addresses.
     */
    const fetchAddresses = () =>
        fetchAny(() => apiGetAddresses().then((data) => readAddressesResponse(data)));

    /**
     * Re-reads the book after a write that answered one entry. Called inside a write's own
     * `fetchAny`, so `loading` stays up for the whole write-then-read and does not flicker.
     *
     * @returns A promise resolving with the addresses as the server now holds them.
     */
    const reloadBook = () => apiGetAddresses().then((data) => readAddressesResponse(data));

    /**
     * Adds an entry, then reloads the book. The first one becomes the default server-side, and
     * `default: true` demotes the previous holder — a different row from the created one the API
     * answers with.
     *
     * @param address - The entry's fields; `default: true` claims the default slot.
     * @returns A promise resolving with the updated book.
     */
    const addAddress = (address: AddressInput) =>
        fetchAny(() => apiAddAddress(address).then(() => reloadBook()));

    /**
     * Updates one entry through PATCH, then reloads the book. The default is
     * not a field of one address: `setDefaultAddress` moves it.
     *
     * @param addressId - Which entry.
     * @param changes - The fields to change.
     * @returns A promise resolving with the updated book.
     */
    const updateAddress = (addressId: string, changes: UpdateAddressRequest) =>
        fetchAny(() => apiUpdateAddress(addressId, changes).then(() => reloadBook()));

    /**
     * Makes one entry the book's default — `PUT /account/addresses/{addressId}/default`, an
     * idempotent action — then reloads the book, since the demoted holder is another row.
     *
     * @param addressId - Which entry.
     * @returns A promise resolving with the updated book.
     */
    const setDefaultAddress = (addressId: string) =>
        fetchAny(() => apiSetDefaultAddress(addressId).then(() => reloadBook()));

    /**
     * Removes one entry; removing the default promotes the oldest survivor server-side.
     *
     * @param addressId - Which entry.
     * @returns A promise resolving with the updated book.
     */
    const removeAddress = (addressId: string) =>
        fetchAny(() => apiRemoveAddress(addressId).then((data) => readAddressesResponse(data)));

    return {
        addresses,
        loading,
        fetchAddresses,
        addAddress,
        updateAddress,
        setDefaultAddress,
        removeAddress
    };
});
