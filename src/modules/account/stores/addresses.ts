import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useCoreStore, useStructureRestApi } from '@guebbit/vue-toolkit';
import {
    getAddresses as apiGetAddresses,
    addAddress as apiAddAddress,
    updateAddress as apiUpdateAddress,
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
    const { getLoading, setLoading } = useCoreStore();
    const { loading, fetchAny } = useStructureRestApi<Address, string>({ getLoading, setLoading });

    /**
     * The visitor's address book. Whole-list state, for the same reason `sessions` is in its own
     * store — the invariant worth rendering after any write is "exactly one default", which is a
     * property of the list.
     */
    const addresses = ref<Address[]>([]);

    /**
     * Replace the local book with the payload every address endpoint answers with.
     *
     * Typed as the generated envelope rather than `unknown`, so the four call sites are checked
     * against the contract instead of being waved through a cast: the day an endpoint stops
     * answering with the address book, this stops compiling.
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
     * Adds an entry. The first one becomes the default server-side.
     *
     * @param address - The entry's fields; `default: true` claims the default slot.
     * @returns A promise resolving with the updated book.
     */
    const addAddress = (address: AddressInput) =>
        fetchAny(() => apiAddAddress(address).then((data) => readAddressesResponse(data)));

    /**
     * Updates one entry. `default: true` claims the slot; absent leaves it alone.
     *
     * @param addressId - Which entry.
     * @param changes - The fields to change.
     * @returns A promise resolving with the updated book.
     */
    const updateAddress = (addressId: string, changes: UpdateAddressRequest) =>
        fetchAny(() =>
            apiUpdateAddress(addressId, changes).then((data) => readAddressesResponse(data))
        );

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
        removeAddress
    };
});
