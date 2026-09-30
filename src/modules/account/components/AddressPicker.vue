<script lang="ts">
export default {
    name: 'AddressPicker'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Checkout's address choice: a radio per saved entry, bound to `defineModel`, mirroring
 * `ShippingSelector.vue`'s own shape. The add-address dialog is the profile page's own
 * (`AddressFormDialog.vue`), reachable whether or not the book is empty — a second delivery place is
 * a normal checkout need — and the entry it saves becomes the choice.
 */
import { onMounted, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { Plus } from 'lucide-vue-next';
import { useAddressesStore } from '../stores/addresses.ts';
import AddressFormDialog from './AddressFormDialog.vue';

/**
 * The chosen address's entry id, or undefined while nothing is selected — checkout only requires
 * one when the chosen shipping method's own `requiresAddress` is true (the caller's job to check).
 */
const addressId = defineModel<string | undefined>();

const { shipToCountries } = defineProps<{
    /**
     * Narrows the add-address dialog's country select to this list (E12) — `Cart.vue` reads it
     * off `ShippingSelector` and forwards it here, so checkout never offers a country the shop
     * cannot deliver to. Forwarded to `AddressFormDialog.vue` as-is.
     */
    shipToCountries?: string[];
}>();

const { t } = useI18n();
const titleId = useId();

/**
 * Address book store — shared with the profile page, so an address added at checkout shows up
 * there too, and vice versa.
 */
const addressesStore = useAddressesStore();

/**
 * The visitor's saved addresses, reactive.
 */
const { addresses } = storeToRefs(addressesStore);

/**
 * Whether the add-address dialog is open.
 */
const dialogOpen = ref(false);

onMounted(() => {
    if (addresses.value.length === 0) void addressesStore.fetchAddresses();
});

/**
 * Keeps the choice sensible as the list changes:
 *
 * - an entry that appeared in a book that already had some is the visitor's own add — choose it;
 * - otherwise, with nothing valid chosen (nothing yet, or the entry is gone), fall back to the
 *   `default` one, or the first.
 *
 * A still-valid manual choice is never overridden by the fallback. `immediate`, so it also covers
 * a book already loaded at mount.
 */
watch(
    addresses,
    (list, previous) => {
        if (list.length === 0) return;
        const added = previous?.length
            ? list.find((address) => !previous.some(({ id }) => id === address.id))
            : undefined;
        if (added) {
            addressId.value = added.id;
            return;
        }
        if (addressId.value && list.some((address) => address.id === addressId.value)) return;
        addressId.value = (list.find((address) => address.default) ?? list[0]).id;
    },
    { immediate: true }
);
</script>

<template>
    <div data-test="address-picker">
        <h3 :id="titleId" class="mb-1 text-base font-semibold">
            {{ t('address-picker.title') }}
        </h3>
        <v-radio-group v-if="addresses.length > 0" v-model="addressId" :aria-labelledby="titleId">
            <v-radio
                v-for="address in addresses"
                :key="address.id"
                :value="address.id"
                :data-test="'address-picker-' + address.id"
            >
                <template #label>
                    <span>
                        {{ address.label || address.fullName }} — {{ address.street }},
                        {{ address.city }}
                    </span>
                </template>
            </v-radio>
        </v-radio-group>
        <p v-else class="mb-2 opacity-70" data-test="address-picker-empty">
            {{ t('address-picker.empty') }}
        </p>
        <v-btn
            variant="tonal"
            size="small"
            data-test="address-picker-add"
            @click="dialogOpen = true"
        >
            <Plus :size="16" class="mr-1" aria-hidden="true" />
            {{ t('address-picker.add') }}
        </v-btn>
        <AddressFormDialog v-model="dialogOpen" :ship-to-countries="shipToCountries" />
    </div>
</template>
