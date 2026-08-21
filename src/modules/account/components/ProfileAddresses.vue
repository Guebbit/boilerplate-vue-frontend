<script lang="ts">
export default {
    name: 'ProfileAddresses'
};
</script>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { MapPin, Plus, Star } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useAccountStore } from '@/modules/account/store.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import type { Address, AddressInput } from '@types';
import { useDialogStore } from '@/infrastructure/stores/dialog.ts';

/**
 * The address book panel. Every write re-renders from the whole list the API answers with,
 * because the fact worth showing after any of them — exactly one default — is a property of the
 * list, not of the entry that changed.
 */
const { t } = useI18n();
const { addMessage } = useNotificationsStore();
const { fetchAddresses, addAddress, updateAddress, removeAddress } = useAccountStore();
const { addresses, loading } = storeToRefs(useAccountStore());

/** Blank form — also what "add another" resets to. */
const emptyForm = (): AddressInput => ({
    label: '',
    fullName: '',
    street: '',
    city: '',
    zip: '',
    country: '',
    phone: ''
});

const dialogOpen = ref(false);
/** The entry being edited, or `undefined` when the dialog is adding a new one. */
const editingId = ref<string>();
const form = ref<AddressInput>(emptyForm());

/** Opens the dialog empty, for a new entry. */
const openAdd = () => {
    editingId.value = undefined;
    form.value = emptyForm();
    dialogOpen.value = true;
};

/**
 * Opens the dialog prefilled with one entry.
 *
 * @param address - The entry to edit.
 */
const openEdit = (address: Address) => {
    editingId.value = address.id;
    form.value = {
        label: address.label ?? '',
        fullName: address.fullName,
        street: address.street,
        city: address.city,
        zip: address.zip,
        country: address.country,
        phone: address.phone ?? ''
    };
    dialogOpen.value = true;
};

/**
 * Saves the dialog: an update when an entry is being edited, an add otherwise. Empty optional
 * fields are dropped rather than sent as empty strings.
 *
 * @returns Nothing; the outcome is reported as a toast.
 */
const handleSave = () => {
    const payload: AddressInput = {
        ...form.value,
        label: form.value.label || undefined,
        phone: form.value.phone || undefined
    };
    const save = editingId.value ? updateAddress(editingId.value, payload) : addAddress(payload);
    save.then(() => {
        addMessage(t('profile-page.addresses-saved'));
        dialogOpen.value = false;
    }).catch((error) => notifyErrorMessages(addMessage, error));
};

/**
 * Claims the default slot for one entry.
 *
 * @param address - The entry to promote.
 * @returns Nothing; the outcome is reported as a toast.
 */
const handleMakeDefault = (address: Address) => {
    updateAddress(address.id, { default: true }).catch((error) =>
        notifyErrorMessages(addMessage, error)
    );
};

/**
 * Removes one entry after an explicit confirmation.
 *
 * @param address - The entry to remove.
 * @returns Nothing; the outcome is reported as a toast.
 */
const handleRemove = (address: Address) =>
    useDialogStore()
        .confirm({ message: t('profile-page.addresses-confirm-remove'), color: 'error' })
        .then((accepted) => {
            if (!accepted) return;
            return removeAddress(address.id)
                .then(() => addMessage(t('profile-page.addresses-removed')))
                .catch((error) => notifyErrorMessages(addMessage, error));
        });

onMounted(fetchAddresses);
</script>

<template>
    <v-card class="p-8" data-test="profile-addresses">
        <div class="mb-4 flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
                <MapPin :size="20" aria-hidden="true" />
                <h3 class="text-lg font-semibold">{{ t('profile-page.addresses-title') }}</h3>
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
                                size="x-small"
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
                    <v-btn
                        variant="text"
                        size="small"
                        data-test="address-edit"
                        @click="openEdit(address)"
                    >
                        {{ t('profile-page.addresses-edit') }}
                    </v-btn>
                    <v-btn
                        variant="text"
                        color="error"
                        size="small"
                        data-test="address-remove"
                        @click="handleRemove(address)"
                    >
                        {{ t('profile-page.addresses-remove') }}
                    </v-btn>
                </div>
            </v-card>
        </div>

        <v-dialog v-model="dialogOpen" max-width="480">
            <v-card class="p-6" data-test="address-dialog">
                <h3 class="mb-4 text-lg font-semibold">
                    {{
                        editingId
                            ? t('profile-page.addresses-edit')
                            : t('profile-page.addresses-add')
                    }}
                </h3>
                <form novalidate @submit.prevent="handleSave">
                    <v-text-field
                        v-model="form.label"
                        :label="t('profile-page.addresses-label-label')"
                        class="mb-2"
                    />
                    <v-text-field
                        v-model="form.fullName"
                        :label="t('profile-page.addresses-label-full-name')"
                        autocomplete="name"
                        class="mb-2"
                    />
                    <v-text-field
                        v-model="form.street"
                        :label="t('profile-page.addresses-label-street')"
                        autocomplete="street-address"
                        class="mb-2"
                    />
                    <div class="grid grid-cols-2 gap-2">
                        <v-text-field
                            v-model="form.zip"
                            :label="t('profile-page.addresses-label-zip')"
                            autocomplete="postal-code"
                        />
                        <v-text-field
                            v-model="form.city"
                            :label="t('profile-page.addresses-label-city')"
                            autocomplete="address-level2"
                        />
                    </div>
                    <v-text-field
                        v-model="form.country"
                        :label="t('profile-page.addresses-label-country')"
                        autocomplete="country"
                        class="mb-2"
                    />
                    <v-text-field
                        v-model="form.phone"
                        :label="t('profile-page.addresses-label-phone')"
                        autocomplete="tel"
                        type="tel"
                    />
                    <div class="mt-4 flex justify-end gap-2">
                        <v-btn variant="text" @click="dialogOpen = false">
                            {{ t('generic.cancel') }}
                        </v-btn>
                        <v-btn
                            type="submit"
                            color="primary"
                            data-test="address-save"
                            :loading="loading"
                        >
                            {{ t('profile-page.addresses-save') }}
                        </v-btn>
                    </div>
                </form>
            </v-card>
        </v-dialog>
    </v-card>
</template>
