<script lang="ts">
export default {
    name: 'UserEditPage'
};
</script>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useUsersStore } from '@/modules/users/store';
import { usersSchema, usersPasswordSchema } from '@/modules/users/schemas.ts';
import { z } from 'zod';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import { Pencil, User } from 'lucide-vue-next';
import ItemDetailField from '@/ui/molecules/ItemDetailField.vue';
import FormImageUpload from '@/ui/molecules/FormImageUpload.vue';
import ItemDetailLayout from '@/ui/organisms/ItemDetailLayout.vue';
import CardDetail from '@/ui/organisms/CardDetail.vue';
import CardInfo from '@/ui/organisms/CardInfo.vue';
import ItemDetailHero from '@/ui/organisms/ItemDetailHero.vue';
import CardMaterialStat from '@/ui/organisms/CardMaterialStat.vue';
import {
    EMPTY_VALUE,
    formatText,
    formatDateTime,
    formatFlag
} from '@/infrastructure/utils/formatters.ts';
import {
    notifyErrorMessages,
    VUETIFY_INVALID_FIELD_SELECTOR
} from '@/infrastructure/utils/errors.ts';
import { imageUploadSchema } from '@/infrastructure/utils/uploads.ts';
import { useUploadProgress } from '@/infrastructure/composables/use-upload-progress.ts';

/**
 * Generic i18n/notifications helpers.
 */
const { t, locale } = useI18n();
const { addMessage } = useNotificationsStore();

/**
 * User id route param.
 */
const { id } = defineProps<{
    id?: string;
}>();

/**
 * User store APIs and references.
 */
const { watchUser, updateUser } = useUsersStore();
const { currentUser, loading } = storeToRefs(useUsersStore());

/**
 * Edit form data model.
 */
interface UserEditForm {
    email?: string;
    password?: string;
    imageUpload?: File;
}

/**
 * Validation schema of the edit form, where the password is an optional replacement (an empty
 * field means "leave it as it is") and so is the avatar.
 *
 * Built once. Its messages are thunks resolved at parse time, so it speaks the active language
 * without being rebuilt — see `@/modules/users/schemas.ts`.
 */
const editSchema = usersSchema.pick({ email: true }).extend({
    password: z.preprocess((v) => (v === '' ? undefined : v), usersPasswordSchema.optional()),
    imageUpload: imageUploadSchema
});

/**
 * Toolkit form bindings.
 */
const formElement = ref<HTMLFormElement>();

const {
    form,
    formErrors,
    showFormErrors,
    isSubmitting,
    resetForm,
    handleSubmit,
    activateAutoHydrate,
    applyServerErrors
} = useStructureFormValidation<UserEditForm>({}, editSchema, {
    revalidateOn: locale,
    // The toolkit reveals the errors, waits for the render and focuses the first invalid field.
    formElement,
    invalidFieldSelector: VUETIFY_INVALID_FIELD_SELECTOR,
    onInvalid: () => addMessage(t('users-form.fix-errors'))
});

/**
 * Avatar upload progress, shown by `FormImageUpload` while a multipart save is in flight.
 */
const { uploadProgress, trackUpload } = useUploadProgress();

/**
 * Auto-hydrate the form from the fetched record once it resolves.
 */
activateAutoHydrate(
    computed(() =>
        currentUser.value
            ? {
                  email: currentUser.value.email,
                  password: ''
              }
            : undefined
    )
);

/**
 * Hero heading.
 *
 * @returns The loaded username, the route id while loading, or the generic page
 *  title as a last resort.
 */
const heroTitle = computed(
    () => currentUser.value?.username ?? id ?? t('user-edit-page.page-title')
);

/**
 * Hero subheading.
 *
 * @returns The user email, or the empty-value glyph when unknown.
 */
const heroDescription = computed(() => formatText(currentUser.value?.email));

/**
 * Label of the role chip.
 *
 * @returns The localized administrator/standard-user wording, or the
 *  empty-value glyph while the user is unknown.
 */
const userRole = computed(() =>
    formatFlag(currentUser.value?.admin, t('generic.administrator'), t('generic.standard-user'))
);

/**
 * Label of the status chip.
 *
 * @returns The localized enabled/disabled wording, or the empty-value glyph
 *  while the user is unknown.
 */
const userStatus = computed(() =>
    formatFlag(currentUser.value?.active, t('generic.enabled'), t('generic.disabled'))
);

/**
 * Validates the form and persists the user changes.
 *
 * @returns A promise resolving once the flow settles: a success toast, or the
 *  revealed validation errors when the input is invalid. API failures surface as
 *  a toast. A missing route id is a no-op.
 */
const submitForm = () =>
    handleSubmit(() => {
        if (!id) return;
        const { email, password, imageUpload } = form.value;
        return trackUpload(imageUpload, (options) =>
            updateUser(id, { email, password: password || undefined, imageUpload }, options)
        ).then(() => {
            // Same as `ProductEdit.vue`: the served `imageUrl` is back in `currentUser`, so the
            // local File has done its job and holding it would only re-upload the same bytes on
            // the next save.
            form.value.imageUpload = undefined;
            addMessage(t('user-edit-page.success-update'));
        });
    }).catch((error) => {
        if (!applyServerErrors(error)) notifyErrorMessages(addMessage, error);
    });

/**
 * Selects and (re)fetches the user whenever the route id changes.
 */
watchUser(() => id);
</script>

<template>
    <LayoutDefault id="user-edit-page" :title="t('user-edit-page.page-title')">
        <ItemDetailLayout accent="secondary">
            <template #hero>
                <ItemDetailHero :title="heroTitle" :description="heroDescription" :eyebrow="id">
                    <template #icon><Pencil :size="32" /></template>
                </ItemDetailHero>
            </template>

            <template #stats>
                <CardMaterialStat
                    :title="t('user-target-page.label-id')"
                    :value="id ?? EMPTY_VALUE"
                />
                <CardMaterialStat
                    :title="t('user-target-page.label-admin')"
                    :value="userRole"
                    accent="secondary"
                />
                <CardMaterialStat
                    :title="t('user-target-page.label-active')"
                    :value="userStatus"
                    accent="tertiary"
                />
            </template>

            <CardDetail>
                <div class="mb-5">
                    <h3 class="text-lg font-semibold">{{ t('generic.details') }}</h3>
                    <p class="mt-1 opacity-75">{{ t('user-edit-page.page-title') }}</p>
                </div>

                <form
                    ref="formElement"
                    novalidate
                    class="flex flex-col gap-2"
                    @submit.prevent="submitForm"
                >
                    <v-text-field
                        v-model="form.email"
                        type="email"
                        :label="t('user-edit-page.label-email')"
                        :error-messages="showFormErrors ? formErrors.email : []"
                    />
                    <v-text-field
                        v-model="form.password"
                        type="password"
                        autocomplete="new-password"
                        :label="t('user-edit-page.label-password')"
                        :error-messages="showFormErrors ? formErrors.password : []"
                    />
                    <FormImageUpload
                        v-model="form.imageUpload"
                        :current-image-url="currentUser?.imageUrl"
                        :error-messages="showFormErrors ? formErrors.imageUpload : []"
                        :progress="uploadProgress"
                        :disabled="isSubmitting"
                    />

                    <div class="flex flex-wrap gap-2">
                        <v-btn type="submit" color="primary" :disabled="isSubmitting || loading">
                            {{ t('user-edit-page.button-submit') }}
                        </v-btn>
                        <v-btn variant="tonal" @click="resetForm">
                            {{ t('user-edit-page.reset-form') }}
                        </v-btn>
                    </div>
                </form>
            </CardDetail>

            <template #aside>
                <CardDetail as="aside" class="flex flex-col gap-4">
                    <CardInfo :title="heroTitle" :description="heroDescription" variant="secondary">
                        <template #icon><User :size="28" /></template>
                    </CardInfo>
                    <ItemDetailField
                        :label="t('user-target-page.label-id')"
                        :value="id ?? EMPTY_VALUE"
                        icon="#"
                    />
                    <ItemDetailField
                        :label="t('user-target-page.label-created-at')"
                        :value="formatDateTime(currentUser?.createdAt)"
                        icon="📅"
                    />
                    <ItemDetailField
                        :label="t('user-target-page.label-updated-at')"
                        :value="formatDateTime(currentUser?.updatedAt)"
                        icon="🕘"
                    />
                </CardDetail>
            </template>

            <template #actions>
                <v-btn
                    v-if="id"
                    color="secondary"
                    :to="routerLinkI18n({ name: 'UserTarget', params: { id } })"
                >
                    {{ t('user-edit-page.button-go-to-details') }}
                </v-btn>
                <v-btn variant="tonal" :to="routerLinkI18n({ name: 'UsersList' })">
                    {{ t('user-edit-page.button-go-to-list') }}
                </v-btn>
            </template>
        </ItemDetailLayout>
    </LayoutDefault>
</template>
