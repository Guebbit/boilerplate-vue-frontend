<script lang="ts">
export default {
    name: 'UserEditPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * User-edit page: the complete admin form — email, username, password, role, active, locale,
 * phone, website and avatar — built on `useStructureFormValidation` (an empty password or avatar
 * field means "leave as is"), submitting multipart only when a new avatar is attached.
 *
 * Role and active status get one more gate than the rest: `UserAccessDialog`'s confirm step,
 * opened on Save whenever either differs from the loaded record, before the `PATCH` is sent at
 * all — see `submitForm`'s own note on why an unchanged `role` must never ride along regardless.
 */
import { computed, ref } from 'vue';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useAxiosUploadProgress } from '@/ui/composables/use-axios-upload-progress.ts';
import { useUsersStore } from '@/modules/users/store';
import { useUserAccessDialog } from '@/modules/users/composables/use-user-access-dialog.ts';
import { usersSchema, usersPasswordSchema } from '@/modules/users/schemas.ts';
import { userRoleOptions } from '@/modules/users/domain';
import { supportedLanguages } from '@/infrastructure/i18n';
import { z } from 'zod';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import { Calendar, Clock, Hash, Pencil, User } from 'lucide-vue-next';
import ItemDetailField from '@/ui/molecules/ItemDetailField.vue';
import FormImageUpload from '@/ui/molecules/FormImageUpload.vue';
import ItemDetailLayout from '@/ui/organisms/ItemDetailLayout.vue';
import CardDetail from '@/ui/organisms/CardDetail.vue';
import CardInfo from '@/ui/organisms/CardInfo.vue';
import ItemDetailHero from '@/ui/organisms/ItemDetailHero.vue';
import CardMaterialStat from '@/ui/organisms/CardMaterialStat.vue';
import UserAccessDialog from '@/modules/users/components/UserAccessDialog.vue';
import {
    EMPTY_VALUE,
    formatText,
    formatDateTime,
    formatFlag
} from '@/infrastructure/utils/formatters.ts';
import { VUETIFY_INVALID_FIELD_SELECTOR } from '@/infrastructure/utils/errors.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { imageUploadSchema } from '@/infrastructure/utils/uploads.ts';

/**
 * Generic i18n/notifications helpers.
 */
const { t, locale } = useI18n();

/**
 * Toast dispatcher, used to report every outcome to the visitor.
 */
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

/**
 * The user being edited, and whether a call is in flight.
 */
const { currentUser, loading } = storeToRefs(useUsersStore());

/**
 * Edit form data model — every editable field the record has, per FE_PARITY_0924: the row/detail
 * `UserAccessDialog` shortcuts are conveniences on top of this form, never a replacement for it.
 */
interface UserEditForm {
    email?: string;
    username?: string;
    password?: string;
    role?: string;
    active?: boolean;
    locale?: string;
    phone?: string;
    website?: string;
    imageUpload?: File;
}

/**
 * Validation schema of the edit form, where the password is an optional replacement (an empty
 * field means "leave it as it is") and so is the avatar. `username`/`phone`/`website` are picked
 * from `usersSchema` rather than re-declared, so this form's rules cannot drift from the create
 * form's; `role`/`active` are re-declared plain (`usersSchema`'s own are `nullish`, one shade
 * looser than this form's `string | undefined` needs) and `locale` has no field rule to share (a
 * closed set of codes, enforced by the select's own options, not by string validation).
 *
 * Built once. Its messages are thunks resolved at parse time, so it speaks the active language
 * without being rebuilt — see `@/modules/users/schemas.ts`.
 */
const editSchema = usersSchema
    .pick({ email: true, username: true, phone: true, website: true })
    .extend({
        password: z.preprocess((v) => (v === '' ? undefined : v), usersPasswordSchema.optional()),
        role: z.string().optional(),
        active: z.boolean().optional(),
        locale: z.string().optional(),
        imageUpload: imageUploadSchema
    });

/**
 * Toolkit form bindings.
 */
const formElement = ref<HTMLFormElement>();

/**
 * Form state, validation and submission wiring from the shared app-form composable.
 */
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
    formElement,
    revalidateOn: locale,
    invalidFieldSelector: VUETIFY_INVALID_FIELD_SELECTOR,
    onInvalid: () => addMessage(t('generic.fix-errors'))
});

/**
 * Avatar upload progress, shown by `FormImageUpload` while a multipart save is in flight.
 */
const { progress: uploadProgress, trackUpload } = useAxiosUploadProgress();

/**
 * Auto-hydrate the form from the fetched record once it resolves. `role`/`active` fall back to
 * `''`/`true` (the record's own least-privileged defaults) rather than `undefined`, so
 * {@link roleChanged}/{@link activeChanged} in `submitForm` compare against a concrete baseline
 * instead of two `undefined`s that would always look equal.
 */
activateAutoHydrate(
    computed(() =>
        currentUser.value
            ? {
                  email: currentUser.value.email,
                  username: currentUser.value.username,
                  password: '',
                  role: currentUser.value.role ?? '',
                  active: currentUser.value.active ?? true,
                  locale: currentUser.value.locale ?? '',
                  phone: currentUser.value.phone ?? '',
                  website: currentUser.value.website ?? ''
              }
            : undefined
    )
);

/**
 * The locale select's options — same source as `Profile.vue`'s own language select and
 * `UserCreate.vue`'s new one.
 */
const localeOptions = computed(() =>
    supportedLanguages.map((code) => ({ value: code, title: t(`generic.${code}`) }))
);

/**
 * `UserAccessDialog`'s open state and target, plus the promise-returning `request()` this page's
 * Save button awaits when role or active actually changed — see `use-user-access-dialog.ts`. Every
 * request here passes `skipPicker: true`: the values were already chosen in the form above, so the
 * dialog only needs to run its confirm step.
 */
const {
    isOpen: accessDialogOpen,
    target: accessDialogTarget,
    options: accessDialogOptions,
    request: requestAccessConfirmation,
    confirm: confirmAccessChange,
    cancel: cancelAccessChange
} = useUserAccessDialog();

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
 * @returns The role's own name, or the empty-value glyph while the user is
 *  unknown. Not a translated administrator/standard pair: roles are data a
 *  deployment may add to, and only the rules say what each one may do.
 */
const userRole = computed(() => formatText(currentUser.value?.role));

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
 * This form's own blocked state — a save that failed blocks the visitor from proceeding past this
 * one submit button, so it renders through {@link InlineErrorAlert} next to it rather than a toast
 * — see docs/theory/request-flow.md.
 */
const {
    message: submitError,
    report: reportSubmitError,
    clear: clearSubmitError
} = useBlockingError();

/**
 * Validates the form and persists the user changes.
 *
 * A `role` or `active` that differs from the loaded record goes through `UserAccessDialog`'s
 * confirm step first — cancelling it leaves the form exactly as it was, still editable, nothing
 * sent. Confirmed or not, the `PATCH` body below only ever includes `role`/`active` when they
 * actually changed: the backend's grant check (`assertCanGrant`) runs on any `PATCH` naming a
 * role at all, so re-sending the loaded value would fail an editor with no admin-grant keys for a
 * "change" that isn't one.
 *
 * @returns A promise resolving once the flow settles: a success toast, or the
 *  revealed validation errors when the input is invalid. API failures block the form in place
 *  ({@link submitError}). A missing route id or record is a no-op.
 */
const submitForm = () => {
    clearSubmitError();
    return handleSubmit(() => {
        const target = currentUser.value;
        if (!id || !target) return;
        const { email, username, password, role, active, locale, phone, website, imageUpload } =
            form.value;

        const roleChanged = role !== (target.role ?? '');
        const activeChanged = active !== (target.active ?? true);

        const accepted =
            !roleChanged && !activeChanged
                ? Promise.resolve(true)
                : requestAccessConfirmation(
                      { id, name: target.username, role: target.role, active: target.active },
                      { skipPicker: true, chosenRole: role, chosenActive: active }
                  ).then((result) => !!result);

        return accepted.then((wasAccepted) => {
            if (!wasAccepted) return;
            return trackUpload(imageUpload, (options) =>
                updateUser(
                    id,
                    {
                        email,
                        username,
                        password: password || undefined,
                        role: roleChanged ? role : undefined,
                        active: activeChanged ? active : undefined,
                        locale,
                        phone,
                        website,
                        imageUpload
                    },
                    options
                )
            ).then(() => {
                // Same as `ProductEdit.vue`: the served `imageUrl` is back in `currentUser`, so the
                // local File has done its job and holding it would only re-upload the same bytes on
                // the next save.
                form.value.imageUpload = undefined;
                addMessage(t('user-edit-page.success-update'));
            });
        });
    }).catch((error) => {
        if (!applyServerErrors(error)) reportSubmitError(error);
    });
};

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
                    :title="t('user-target-page.label-role')"
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
                        v-model="form.username"
                        type="text"
                        data-test="user-edit-username"
                        :label="t('user-edit-page.label-username')"
                        :error-messages="showFormErrors ? formErrors.username : []"
                    />
                    <v-text-field
                        v-model="form.password"
                        type="password"
                        autocomplete="new-password"
                        :label="t('user-edit-page.label-password')"
                        :error-messages="showFormErrors ? formErrors.password : []"
                    />
                    <v-text-field
                        v-model="form.phone"
                        type="tel"
                        autocomplete="tel"
                        data-test="user-edit-phone"
                        :label="t('user-edit-page.label-phone')"
                        :error-messages="showFormErrors ? formErrors.phone : []"
                    />
                    <v-text-field
                        v-model="form.website"
                        type="url"
                        autocomplete="url"
                        data-test="user-edit-website"
                        :label="t('user-edit-page.label-website')"
                        :error-messages="showFormErrors ? formErrors.website : []"
                    />
                    <v-select
                        v-model="form.locale"
                        :items="localeOptions"
                        data-test="user-edit-locale"
                        :label="t('user-edit-page.label-locale')"
                    />
                    <div class="flex flex-wrap gap-x-8">
                        <!-- One list, not a free-text field: `domain/roles.ts` is the single place every
                             role select in this module reads from. -->
                        <v-select
                            v-model="form.role"
                            :items="userRoleOptions"
                            data-test="user-edit-role"
                            :label="t('user-edit-page.label-role')"
                        />
                        <v-switch
                            v-model="form.active"
                            data-test="user-edit-active"
                            :label="t('user-edit-page.label-active')"
                        />
                    </div>
                    <FormImageUpload
                        v-model="form.imageUpload"
                        :current-image-url="currentUser?.imageUrl"
                        :error-messages="showFormErrors ? formErrors.imageUpload : []"
                        :progress="uploadProgress"
                        :disabled="isSubmitting"
                    />

                    <InlineErrorAlert :message="submitError" data-test="user-edit-submit-error" />

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
                    <CardInfo :title="heroTitle" :description="heroDescription" accent="secondary">
                        <template #icon><User :size="28" /></template>
                    </CardInfo>
                    <ItemDetailField
                        :label="t('user-target-page.label-id')"
                        :value="id ?? EMPTY_VALUE"
                        :icon="Hash"
                    />
                    <ItemDetailField
                        :label="t('user-target-page.label-created-at')"
                        :value="formatDateTime(currentUser?.createdAt)"
                        :icon="Calendar"
                    />
                    <ItemDetailField
                        :label="t('user-target-page.label-updated-at')"
                        :value="formatDateTime(currentUser?.updatedAt)"
                        :icon="Clock"
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

        <UserAccessDialog
            v-model="accessDialogOpen"
            :target="accessDialogTarget"
            :options="accessDialogOptions"
            @confirm="confirmAccessChange"
            @cancel="cancelAccessChange"
        />
    </LayoutDefault>
</template>
