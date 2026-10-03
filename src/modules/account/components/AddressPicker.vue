<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'AddressPicker'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Checkout's address choice: a radio per saved entry, bound to `defineModel`, mirroring
 * `ShippingSelector.vue`'s own shape. Checkout mounts two — one for the shipping address and one
 * for the billing address (`purpose`). The add-address dialog is the profile page's own
 * (`AddressFormDialog.vue`), reachable whether or not the book is empty — a second place is a
 * normal checkout need — and the entry it saves becomes THIS picker's choice, never the other's.
 */
import { computed, nextTick, onMounted, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { Plus } from 'lucide-vue-next';
import { useAddressesStore } from '../stores/addresses.ts';
import AddressFormDialog from './AddressFormDialog.vue';

/**
 * The radio value standing for "same as the shipping address" — never a real entry id (those are
 * 24-character hex), and never sent to the API: that choice is the model being `undefined`.
 */
const SAME_AS_SHIPPING = 'same-as-shipping';

/**
 * The chosen address's entry id, or undefined while nothing is selected. On a picker that offers
 * {@link sameAsShipping}, `undefined` IS a choice — "same as the shipping address" — and the
 * fallback below never replaces it.
 */
const addressId = defineModel<string | undefined>();

/**
 * Props: which address this picks, the same-as-shipping option and the ship-to country list.
 */
const {
    purpose = 'shipping',
    sameAsShipping,
    shipToCountries
} = defineProps<{
    /**
     * Which address this picker chooses: `shipping` (where the goods go) or `billing` (who the
     * invoice is addressed to). Sets the title, the copy and the `data-test` prefix.
     */
    purpose?: 'shipping' | 'billing';
    /**
     * Offers "same as the shipping address" as the first option, and makes it the default —
     * billing's default whenever something ships to an address.
     */
    sameAsShipping?: boolean;
    /**
     * Narrows the add-address dialog's country select to this list — `Cart.vue` reads it
     * off `ShippingSelector` and forwards it here, so checkout never offers a country the shop
     * cannot deliver to. Forwarded to `AddressFormDialog.vue` as-is.
     */
    shipToCountries?: string[];
}>();

/** Translator for the picker's copy. */
const { t } = useI18n();

/** Unique id that ties the title to the radio group (`aria-labelledby`). */
const titleId = useId();

/**
 * The `data-test` prefix of this picker's purpose — the two share markup, not copy or test ids.
 */
const prefix = computed(() =>
    purpose === 'billing' ? 'billing-address-picker' : 'address-picker'
);

/**
 * The visible copy of this picker's purpose. Spelled out key by key rather than built from
 * {@link prefix}, so a key a locale file never reaches is still found by a search for it.
 */
const copy = computed(() =>
    purpose === 'billing'
        ? {
              title: t('billing-address-picker.title'),
              empty: t('billing-address-picker.empty'),
              add: t('billing-address-picker.add')
          }
        : {
              title: t('address-picker.title'),
              empty: t('address-picker.empty'),
              add: t('address-picker.add')
          }
);

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

/**
 * Whether an address saved right now came from THIS picker's dialog. With two pickers on the page
 * sharing one book, this is what stops billing's new entry becoming the shipping choice.
 */
let addingHere = false;

/**
 * The radio group's value: the entry id, or {@link SAME_AS_SHIPPING} while the model is
 * `undefined` on a picker that offers it.
 */
const choice = computed({
    get: () => addressId.value ?? (sameAsShipping ? SAME_AS_SHIPPING : undefined),
    set: (value: string | undefined) => {
        addressId.value = value === SAME_AS_SHIPPING ? undefined : value;
    }
});

onMounted(() => {
    if (addresses.value.length === 0) void addressesStore.fetchAddresses();
});

watch(dialogOpen, (open) => {
    if (open) {
        addingHere = true;
        return;
    }
    // After the address watcher below has had its turn for the save that closed the dialog.
    void nextTick(() => {
        addingHere = false;
    });
});

/**
 * Keeps the choice sensible as the list changes:
 *
 * - an entry that appeared in a book that already had some, from this picker's own dialog, is the
 *   visitor's own add — choose it;
 * - a book that loads empty drops a choice that points at an entry no longer in it;
 * - otherwise, with nothing valid chosen (nothing yet, or the entry is gone), fall back to the
 *   `default` one, or the first — unless "same as the shipping address" is on offer, which is
 *   itself the standing choice.
 *
 * A still-valid manual choice is never overridden by the fallback. `immediate`, so it also covers
 * a book already loaded at mount.
 */
watch(
    addresses,
    (list, previous) => {
        if (list.length === 0) {
            // A book that LOADED empty (a fresh array after the mount-time read) leaves any
            // restored choice pointing at an entry that is gone; the mount-time call is skipped,
            // since an empty list there only means the read has not answered yet.
            if (previous !== undefined) addressId.value = undefined;
            return;
        }
        const added =
            addingHere && previous?.length
                ? list.find((address) => !previous.some(({ id }) => id === address.id))
                : undefined;
        if (added) {
            addressId.value = added.id;
            return;
        }
        if (addressId.value && list.some((address) => address.id === addressId.value)) return;
        if (sameAsShipping && addressId.value === undefined) return;
        addressId.value = (list.find((address) => address.default) ?? list[0]).id;
    },
    { immediate: true }
);

/**
 * "Same as shipping" appears or disappears as the shipping method changes: it becomes the choice
 * when it appears, and gives way to the default entry when it goes.
 */
watch(
    () => sameAsShipping,
    (offered) => {
        if (offered) {
            addressId.value = undefined;
            return;
        }
        if (addressId.value === undefined && addresses.value.length > 0)
            addressId.value = (
                addresses.value.find((address) => address.default) ?? addresses.value[0]
            ).id;
    }
);
</script>

<template>
    <div :data-test="prefix">
        <h3 :id="titleId" class="mb-1 text-base font-semibold">
            {{ copy.title }}
        </h3>
        <v-radio-group
            v-if="addresses.length > 0 || sameAsShipping"
            v-model="choice"
            :aria-labelledby="titleId"
        >
            <v-radio
                v-if="sameAsShipping"
                :value="SAME_AS_SHIPPING"
                :data-test="prefix + '-same'"
                :label="t('billing-address-picker.same')"
            />
            <v-radio
                v-for="address in addresses"
                :key="address.id"
                :value="address.id"
                :data-test="prefix + '-' + address.id"
            >
                <template #label>
                    <span>
                        {{ address.label || address.fullName }} — {{ address.street }},
                        {{ address.city }}
                    </span>
                </template>
            </v-radio>
        </v-radio-group>
        <p v-else class="mb-2 opacity-70" :data-test="prefix + '-empty'">
            {{ copy.empty }}
        </p>
        <v-btn variant="tonal" size="small" :data-test="prefix + '-add'" @click="dialogOpen = true">
            <Plus :size="16" class="mr-1" aria-hidden="true" />
            {{ copy.add }}
        </v-btn>
        <AddressFormDialog v-model="dialogOpen" :ship-to-countries="shipToCountries" />
    </div>
</template>
