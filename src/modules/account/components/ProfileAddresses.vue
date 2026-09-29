<script lang="ts">
export default {
    name: 'ProfileAddresses'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Address-book panel. Every write chains through the store's fetch-after-write actions and
 * re-renders from the whole list the API answers with, since the fact worth showing after any of
 * them — exactly one default — is a property of the list rather than of the entry that changed.
 *
 * The add/edit dialog is `AddressFormDialog.vue` — shared with `AddressPicker.vue`'s own
 * empty-book affordance, so there is one form and one save path, not two. Promoting a default and
 * removing an entry have no dedicated control of their own, so they share one blocked state
 * (`rowActionError`) above the list instead — same split as `products`' `ProductsList.vue`. See
 * docs/theory/request-flow.md.
 */
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { MapPin, Plus, Star } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useAddressesStore } from '@/modules/account/stores/addresses.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import type { Address } from '@types';
import { useDialogStore } from '@/ui/dialog.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import AddressFormDialog from './AddressFormDialog.vue';

/**
 * The address book panel. Every write re-renders from the whole list the API answers with,
 * because the fact worth showing after any of them — exactly one default — is a property of the
 * list, not of the entry that changed.
 */
const { t } = useI18n();

/**
 * Toast dispatcher, used to report every outcome to the visitor.
 */
const { addMessage } = useNotificationsStore();

/**
 * The address book's remaining two actions — add/edit now live in `AddressFormDialog.vue`.
 */
const { fetchAddresses, setDefaultAddress, removeAddress } = useAddressesStore();

/**
 * The visitor's saved addresses.
 */
const { addresses } = storeToRefs(useAddressesStore());

/**
 * Whether the add/edit dialog is open.
 */
const dialogOpen = ref(false);

/**
 * The entry being edited, or `undefined` when the dialog is adding a new one.
 */
const editing = ref<Address>();

/**
 * The row actions' own blocked state — promoting a default and removing an entry share one
 * instance, since neither has a dedicated control of its own on the page: the list keeps working
 * either way, so one alert above it is where a failure belongs.
 */
const {
    message: rowActionError,
    report: reportRowActionError,
    clear: clearRowActionError
} = useBlockingError();

/**
 * Opens the dialog empty, for a new entry.
 */
const openAdd = () => {
    editing.value = undefined;
    dialogOpen.value = true;
};

/**
 * Opens the dialog prefilled with one entry.
 *
 * @param address - The entry to edit.
 */
const openEdit = (address: Address) => {
    editing.value = address;
    dialogOpen.value = true;
};

/**
 * Claims the default slot for one entry through the book's own action.
 *
 * @param address - The entry to promote.
 * @returns Nothing; a failure blocks the list in place ({@link rowActionError}).
 */
const handleMakeDefault = (address: Address) => {
    clearRowActionError();
    setDefaultAddress(address.id).catch((error) => reportRowActionError(error));
};

/**
 * Removes one entry after an explicit confirmation.
 *
 * @param address - The entry to remove.
 * @returns Nothing; success is toasted, a failure blocks the list in place
 *  ({@link rowActionError}).
 */
const handleRemove = (address: Address) =>
    useDialogStore()
        .confirm({
            message: t('profile-page.addresses-confirm-remove', {
                name: address.label || address.fullName
            }),
            color: 'error'
        })
        .then((accepted) => {
            if (!accepted) return;
            clearRowActionError();
            return removeAddress(address.id)
                .then(() => addMessage(t('profile-page.addresses-removed')))
                .catch((error) => reportRowActionError(error));
        });

onMounted(fetchAddresses);
</script>

<template>
    <v-card class="p-8" data-test="profile-addresses">
        <div class="mb-4 flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
                <MapPin :size="20" aria-hidden="true" />
                <h2 class="text-lg font-semibold">{{ t('profile-page.addresses-title') }}</h2>
            </div>
            <v-btn
                color="primary"
                variant="tonal"
                size="small"
                data-test="address-add"
                @click="openAdd"
            >
                <Plus :size="16" class="mr-1" aria-hidden="true" />
                {{ t('profile-page.addresses-add') }}
            </v-btn>
        </div>

        <InlineErrorAlert
            :message="rowActionError"
            class="mb-4"
            data-test="address-row-action-error"
        />

        <p v-if="addresses.length === 0" class="opacity-70" data-test="addresses-empty">
            {{ t('profile-page.addresses-empty') }}
        </p>

        <div v-else class="grid gap-3 sm:grid-cols-2">
            <v-card
                v-for="address in addresses"
                :key="'address-' + address.id"
                variant="outlined"
                class="p-4"
                data-test="address-item"
            >
                <div class="flex items-start justify-between gap-2">
                    <div>
                        <p class="font-semibold">
                            {{ address.label || address.fullName }}
                            <v-chip
                                v-if="address.default"
                                size="small"
                                color="primary"
                                class="ml-1"
                                data-test="address-default"
                            >
                                {{ t('profile-page.addresses-default') }}
                            </v-chip>
                        </p>
                        <p class="text-sm opacity-80">{{ address.fullName }}</p>
                        <p class="text-sm opacity-80">{{ address.street }}</p>
                        <p class="text-sm opacity-80">
                            {{ address.zip }} {{ address.city }} — {{ address.country }}
                        </p>
                        <p v-if="address.phone" class="text-sm opacity-80">{{ address.phone }}</p>
                    </div>
                </div>
                <div class="mt-3 flex flex-wrap gap-1">
                    <v-btn
                        v-if="!address.default"
                        variant="text"
                        size="small"
                        data-test="address-make-default"
                        :aria-label="t('profile-page.addresses-make-default')"
                        @click="handleMakeDefault(address)"
                    >
                        <Star :size="14" class="mr-1" aria-hidden="true" />
                        {{ t('profile-page.addresses-make-default') }}
                    </v-btn>
                    <!-- Named per entry: a list of identical "Edit" buttons is a list of one. -->
                    <v-btn
                        variant="text"
                        size="small"
                        data-test="address-edit"
                        :aria-label="
                            t('profile-page.addresses-edit-named', {
                                name: address.label || address.fullName
                            })
                        "
                        @click="openEdit(address)"
                    >
                        {{ t('profile-page.addresses-edit') }}
                    </v-btn>
                    <v-btn
                        variant="text"
                        color="error"
                        size="small"
                        data-test="address-remove"
                        :aria-label="
                            t('profile-page.addresses-remove-named', {
                                name: address.label || address.fullName
                            })
                        "
                        @click="handleRemove(address)"
                    >
                        {{ t('profile-page.addresses-remove') }}
                    </v-btn>
                </div>
            </v-card>
        </div>

        <AddressFormDialog v-model="dialogOpen" :editing="editing" />
    </v-card>
</template>
