<script lang="ts">
export default {
    name: 'AddressFormDialog'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The add/edit address dialog, extracted out of `ProfileAddresses.vue` so `AddressPicker.vue`
 * (the checkout side) can offer the same "add an address" flow without a second copy of the
 * form, its schema, or its save logic.
 */
import { computed, ref, useId, watch } from 'vue';
import { z } from 'zod';
import { useI18n } from 'vue-i18n';
import { useDisplay } from 'vuetify';
import { storeToRefs } from 'pinia';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useAddressesStore } from '@/modules/account/stores/addresses.ts';
import { VUETIFY_INVALID_FIELD_SELECTOR } from '@/ui/vuetify/selectors.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { emptyToNull } from '@/infrastructure/utils/forms.ts';
import { ISO_COUNTRY_CODES } from '@/infrastructure/utils/country-codes.ts';
import { countryLabel } from '@/infrastructure/i18n/country-label.ts';
import type { Address, AddressInput, UpdateAddressRequest } from '@types';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';

/**
 * Whether the dialog is open, and the entry being edited — absent means "add a new one", the
 * same convention `ProfileAddresses.vue` used before this was its own component.
 */
const open = defineModel<boolean>({ default: false });

const { editing, shipToCountries } = defineProps<{
    /**
     * The entry to prefill the form with, or `undefined` to add a new one. Read only when the
     * dialog opens (see the `open` watcher below) — editing this prop live while open is not a
     * case either caller needs.
     */
    editing?: Address;
    /**
     * Narrows the country select to this list (E12) — `AddressPicker.vue` passes the deployment's
     * own ship-to list at checkout. Absent or empty, every ISO 3166-1 country is offered instead:
     * the Geo-blocking Regulation lets a shop restrict DELIVERY, not the address book itself, so
     * `ProfileAddresses.vue` never passes this and always gets the full list.
     */
    shipToCountries?: string[];
}>();

const { t, locale } = useI18n();
const { addMessage } = useNotificationsStore();
const { addAddress, updateAddress } = useAddressesStore();
const { addresses, loading } = storeToRefs(useAddressesStore());

/**
 * Whether to offer "set as default" on add — hidden on the very first entry, which is
 * effectively default already, and hidden entirely while editing (demoting happens by making a
 * DIFFERENT entry default, never by unchecking this one).
 */
const offerSetAsDefault = computed(() => !editing && addresses.value.length > 0);

/**
 * Ticked state for the add-only "set as default" checkbox.
 */
const setAsDefaultOnAdd = ref(false);

/**
 * Whether the viewport is phone-sized — the dialog goes `fullscreen` there instead of floating at
 * a fixed `max-width`, which would otherwise cramp this form's fields on a narrow screen.
 */
const { mobile } = useDisplay();

/**
 * The dialog's fields: every `AddressInput` string, optional ones as empty strings.
 */
interface AddressForm {
    label: string;
    fullName: string;
    street: string;
    city: string;
    zip: string;
    country: string;
    phone: string;
}

/**
 * Blank form — also what closing and reopening for "add" resets to.
 */
const emptyForm = (): AddressForm => ({
    label: '',
    fullName: '',
    street: '',
    city: '',
    zip: '',
    country: '',
    phone: ''
});

/**
 * The form built from an entry being edited, or blank for a new one.
 *
 * @param address - The entry to prefill from, or `undefined`.
 */
const formFrom = (address: Address | undefined): AddressForm =>
    address
        ? {
              label: address.label ?? '',
              fullName: address.fullName,
              street: address.street,
              city: address.city,
              zip: address.zip,
              country: address.country,
              phone: address.phone ?? ''
          }
        : emptyForm();

/**
 * The dialog heading's id, so the dialog is announced by its title rather than as "dialog".
 */
const dialogTitleId = useId();

/**
 * The country select's own options (E12): {@link shipToCountries} when the caller named one,
 * every ISO 3166-1 country otherwise — localized in the active locale and sorted by that label,
 * so the list reads correctly whatever language the visitor is in rather than in raw code order.
 */
const countryOptions = computed(() =>
    (shipToCountries?.length ? shipToCountries : ISO_COUNTRY_CODES)
        .map((code) => ({ value: code, title: countryLabel(code, locale.value) }))
        .toSorted((a, b) => a.title.localeCompare(b.title, locale.value))
);

/**
 * The contract's own rule — five non-empty strings — said in the visitor's language. Messages
 * are thunks so they resolve in the active locale, like every other schema here.
 */
const addressSchema = z.object({
    label: z.string(),
    fullName: z.string().min(1, { error: () => t('profile-page.addresses-required-full-name') }),
    street: z.string().min(1, { error: () => t('profile-page.addresses-required-street') }),
    city: z.string().min(1, { error: () => t('profile-page.addresses-required-city') }),
    zip: z.string().min(1, { error: () => t('profile-page.addresses-required-zip') }),
    country: z.string().min(1, { error: () => t('profile-page.addresses-required-country') }),
    phone: z.string()
});

/*
 * No `formElement`: the dialog traps focus already — a dialog's `revealErrors` is a state
 * change, not a focus move.
 */
const { form, formErrors, showFormErrors, handleSubmit, setForm } =
    useStructureFormValidation<AddressForm>(emptyForm(), addressSchema, {
        revalidateOn: locale,
        invalidFieldSelector: VUETIFY_INVALID_FIELD_SELECTOR,
        onInvalid: () => addMessage(t('generic.fix-errors'))
    });

/**
 * The dialog's own blocked state — a save failure stays inside the dialog it happened in, since
 * the dialog stays open for another attempt rather than closing on failure.
 */
const { message: saveError, report: reportSaveError, clear: clearSaveError } = useBlockingError();

/*
 * Resets the form to whatever `editing` names, each time the dialog opens — the two callers
 * (`ProfileAddresses.vue`, `AddressPicker.vue`) both open it fresh rather than toggling `editing`
 * while it stays open.
 */
watch(open, (isOpen) => {
    if (!isOpen) return;
    setForm(formFrom(editing));
    setAsDefaultOnAdd.value = false;
    clearSaveError();
});

/**
 * Saves the dialog: an update when `editing` names an entry, an add otherwise.
 *
 * An emptied label/phone means two different things depending on which one this is: on an add
 * there is no prior value, so it is just omitted; on an update (a PATCH merge) an omitted field
 * is read as "leave it alone" — clearing one that was set needs an explicit `null`
 * ({@link emptyToNull}), the AUDIT_0924 D17c contract's own way of saying so.
 *
 * @returns Nothing; success is toasted and closes the dialog — both callers read the shared
 *  address store's own reactive list, so neither needs a `saved` event to react to it; a failure
 *  blocks the dialog in place ({@link saveError}).
 */
const handleSave = () =>
    handleSubmit((fields) => {
        const addPayload: AddressInput = {
            ...fields,
            label: fields.label || undefined,
            phone: fields.phone || undefined,
            // Only ever `true`, never `false`: the backend ignores a `false` here entirely, and
            // the only way to demote an entry is making a DIFFERENT one the default instead.
            ...(offerSetAsDefault.value && setAsDefaultOnAdd.value ? { default: true } : {})
        };
        const save = editing
            ? updateAddress(editing.id, {
                  ...fields,
                  label: emptyToNull(fields.label),
                  phone: emptyToNull(fields.phone)
              } satisfies UpdateAddressRequest)
            : addAddress(addPayload);
        return save
            .then(() => {
                addMessage(t('profile-page.addresses-saved'));
                open.value = false;
            })
            .catch((error: unknown) => reportSaveError(error));
    });
</script>

<template>
    <v-dialog v-model="open" max-width="480" :fullscreen="mobile" :aria-labelledby="dialogTitleId">
        <v-card class="p-6" data-test="address-dialog">
            <h2 :id="dialogTitleId" class="mb-4 text-lg font-semibold">
                {{ editing ? t('profile-page.addresses-edit') : t('profile-page.addresses-add') }}
            </h2>
            <form novalidate @submit.prevent="handleSave">
                <v-text-field
                    v-model="form.label"
                    :label="t('profile-page.addresses-label-label')"
                    :error-messages="showFormErrors ? (formErrors.label ?? []) : []"
                    class="mb-2"
                />
                <v-text-field
                    v-model="form.fullName"
                    :label="t('profile-page.addresses-label-full-name')"
                    :error-messages="showFormErrors ? (formErrors.fullName ?? []) : []"
                    autocomplete="name"
                    class="mb-2"
                />
                <v-text-field
                    v-model="form.street"
                    :label="t('profile-page.addresses-label-street')"
                    :error-messages="showFormErrors ? (formErrors.street ?? []) : []"
                    autocomplete="street-address"
                    class="mb-2"
                />
                <div class="grid grid-cols-2 gap-2">
                    <v-text-field
                        v-model="form.zip"
                        :label="t('profile-page.addresses-label-zip')"
                        :error-messages="showFormErrors ? (formErrors.zip ?? []) : []"
                        autocomplete="postal-code"
                    />
                    <v-text-field
                        v-model="form.city"
                        :label="t('profile-page.addresses-label-city')"
                        :error-messages="showFormErrors ? (formErrors.city ?? []) : []"
                        autocomplete="address-level2"
                    />
                </div>
                <!-- The field holds an ISO 3166-1 alpha-2 code (E12); `autocomplete="country"`
                     is the token the browser's own address autofill expects for that shape,
                     unlike `country-name`'s free text. `v-autocomplete` rather than `v-select`:
                     ~249 options is unusable without typing to filter. -->
                <v-autocomplete
                    v-model="form.country"
                    :items="countryOptions"
                    :label="t('profile-page.addresses-label-country')"
                    :error-messages="showFormErrors ? (formErrors.country ?? []) : []"
                    autocomplete="country"
                    data-test="address-country"
                    class="mb-2"
                />
                <v-text-field
                    v-model="form.phone"
                    :label="t('profile-page.addresses-label-phone')"
                    :error-messages="showFormErrors ? (formErrors.phone ?? []) : []"
                    autocomplete="tel"
                    type="tel"
                />
                <v-checkbox
                    v-if="offerSetAsDefault"
                    v-model="setAsDefaultOnAdd"
                    :label="t('profile-page.addresses-set-default')"
                    data-test="address-set-default"
                    density="compact"
                    hide-details
                />
                <InlineErrorAlert
                    :message="saveError"
                    class="mb-2"
                    data-test="address-save-error"
                />
                <div class="mt-4 flex justify-end gap-2">
                    <v-btn variant="text" @click="open = false">
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
</template>
