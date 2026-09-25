<script lang="ts">
export default {
    name: 'AddressPicker'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Checkout's address choice: a radio per saved entry, bound to `defineModel`, mirroring
 * `ShippingSelector.vue`'s own shape. An empty book offers the same add-address dialog the
 * profile page uses (`AddressFormDialog.vue`) rather than a second copy of that form.
 */
import { onMounted, ref, useId } from 'vue';
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
 * Selects the book's default entry — called once the add-address dialog reports a save, which
 * this component only offers on an empty book, so the entry it just created is always the one
 * about to become `default`. A visitor who already had a book still picks a radio by hand, the
 * same as `ShippingSelector.vue`'s own method choice.
 */
const selectDefault = () => {
    const entry = addresses.value.find((address) => address.default) ?? addresses.value[0];
    addressId.value = entry.id;
};
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
        <template v-else>
            <p class="mb-2 opacity-70" data-test="address-picker-empty">
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
        </template>
        <AddressFormDialog v-model="dialogOpen" @saved="selectDefault" />
    </div>
</template>
