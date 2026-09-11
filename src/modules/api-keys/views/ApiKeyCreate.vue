<script lang="ts">
export default {
    name: 'ApiKeyCreatePage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Credential mint page. Builds a form on `useStructureFormValidation`; on success the one-time
 * secret is held locally and shown through `SecretRevealModal` — there is no detail page to land
 * on afterwards, unlike webhooks' redirect to its subscription's own page, so `Done` goes back to
 * the list.
 */
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useApiKeysStore } from '@/modules/api-keys/store';
import { apiKeyCreateSchema } from '@/modules/api-keys/schemas.ts';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import FormCard from '@/ui/organisms/FormCard.vue';
import SecretRevealModal from '@/ui/organisms/SecretRevealModal.vue';
import { getFirstApiError } from '@/infrastructure/http/envelope.ts';
import {
    notifyErrorMessages,
    VUETIFY_INVALID_FIELD_SELECTOR
} from '@/infrastructure/utils/errors.ts';
import type { MintApiKeyRequest } from '@types';

/**
 * Generics
 */
const { t, locale } = useI18n();

/**
 * Toast dispatcher, used to report every outcome to the visitor.
 */
const { addMessage } = useNotificationsStore();

/**
 * Router instance, for the navigation once the reveal modal is dismissed.
 */
const router = useRouter();

/**
 * The store action that mints the credential.
 */
const { mintCredential } = useApiKeysStore();

/**
 * Reference to the mounted `FormCard`, read for its `<form>` element.
 */
const card = ref<InstanceType<typeof FormCard>>();

/**
 * Form state, validation and submission wiring from the shared app-form composable.
 */
const { form, formErrors, showFormErrors, isSubmitting, handleSubmit, applyServerErrors } =
    useStructureFormValidation<{ name?: string; permissions?: string[]; expiresAt?: string }>(
        {},
        apiKeyCreateSchema,
        {
            formElement: () => card.value?.formElement,
            revalidateOn: locale,
            invalidFieldSelector: VUETIFY_INVALID_FIELD_SELECTOR,
            onInvalid: () => addMessage(t('generic.fix-errors'))
        }
    );

/**
 * The newly minted secret, held only long enough to render the reveal modal. Never sent anywhere
 * but this component; the store's own cache never sees it (`store.ts`'s `mintCredential`).
 */
const revealedSecret = ref<string>();

/**
 * Reads the offending permission keys off a mint refusal — `details.permissions`, named exactly,
 * per the backend's own contract. Not shaped like an ordinary validation error (no top-level
 * `field`), so `applyServerErrors`'s generic field-detection cannot map it; this reads it by hand
 * instead, and `applyServerErrors` stays the fallback for anything else the endpoint might refuse.
 *
 * @param error - the rejected value from `mintCredential`
 * @returns the refused permission keys, or an empty array when the shape does not match
 */
const permissionsRefused = (error: unknown): string[] => {
    const details = getFirstApiError(error)?.details;
    if (typeof details !== 'object' || details === null) return [];
    const { permissions } = details as { permissions?: unknown };
    return Array.isArray(permissions)
        ? permissions.filter((key): key is string => typeof key === 'string')
        : [];
};

/**
 * Validates the form and mints the credential. On success the secret-reveal modal takes over the
 * page; a refusal naming specific permission keys lands on the combobox, anything else falls
 * through to `applyServerErrors` and then a toast.
 *
 * @returns A promise resolving once the flow settles.
 */
const submitForm = () =>
    handleSubmit(() => {
        const data: MintApiKeyRequest = {
            name: form.value.name!,
            permissions: form.value.permissions!,
            // `datetime-local` has no timezone of its own; the contract wants a real ISO instant.
            ...(form.value.expiresAt
                ? { expiresAt: new Date(form.value.expiresAt).toISOString() }
                : {})
        };
        return mintCredential(data).then((created) => {
            if (!created?.secret) return;
            revealedSecret.value = created.secret;
        });
    }).catch((error: unknown) => {
        const refused = permissionsRefused(error);
        if (refused.length > 0) {
            formErrors.value = {
                ...formErrors.value,
                permissions: refused.map((key) =>
                    t('api-key-create-page.error-permission-refused', { key })
                )
            };
            showFormErrors.value = true;
            return;
        }
        if (!applyServerErrors(error)) notifyErrorMessages(addMessage, error);
    });

/**
 * Leaves the reveal modal and returns to the credentials list.
 */
const handleSecretDone = () => {
    addMessage(t('api-key-create-page.success-create'));
    revealedSecret.value = undefined;
    // Fire-and-forget: a NavigationFailure must not convert a completed mint into an error toast.
    void router.push({ name: 'ApiKeysList' });
};
</script>

<template>
    <LayoutDefault id="api-key-create-page" :title="t('api-key-create-page.page-title')">
        <v-dialog :model-value="!!revealedSecret" persistent max-width="640">
            <SecretRevealModal
                v-if="revealedSecret"
                :secret="revealedSecret"
                :title="t('api-key-secret-modal.title')"
                :intro="t('api-key-secret-modal.intro')"
                @done="handleSecretDone"
            />
        </v-dialog>

        <FormCard
            ref="card"
            :submit-label="t('api-key-create-page.button-submit')"
            :back-to="{ name: 'ApiKeysList' }"
            :back-label="t('api-key-create-page.button-go-to-list')"
            :loading="isSubmitting"
            @submit="submitForm"
        >
            <v-text-field
                v-model="form.name"
                type="text"
                :label="t('api-key-create-page.label-name')"
                :error-messages="showFormErrors ? formErrors.name : []"
                class="mb-2"
            />
            <v-combobox
                v-model="form.permissions"
                multiple
                chips
                closable-chips
                :label="t('api-key-create-page.label-permissions')"
                :hint="t('api-key-create-page.hint-permissions')"
                persistent-hint
                :error-messages="showFormErrors ? formErrors.permissions : []"
                class="mb-2"
            />
            <v-text-field
                v-model="form.expiresAt"
                type="datetime-local"
                :label="t('api-key-create-page.label-expires-at')"
                :hint="t('api-key-create-page.hint-expires-at')"
                persistent-hint
                :error-messages="showFormErrors ? formErrors.expiresAt : []"
            />
        </FormCard>
    </LayoutDefault>
</template>
