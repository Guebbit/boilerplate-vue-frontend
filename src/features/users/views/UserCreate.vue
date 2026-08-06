<template>
    <LayoutDefault id="user-create-page" :title="t('user-create-page.page-title')">
        <v-card class="mx-auto mt-10 w-full max-w-xl p-8">
            <form novalidate @submit.prevent="submitForm">
                <v-text-field
                    v-model="form.email"
                    type="email"
                    :label="t('user-create-page.label-email')"
                    :error-messages="showErrors ? formErrors.email : []"
                    class="mb-2"
                />
                <v-text-field
                    v-model="form.username"
                    type="text"
                    :label="t('user-create-page.label-username')"
                    :error-messages="showErrors ? formErrors.username : []"
                    class="mb-2"
                />
                <v-text-field
                    v-model="form.password"
                    type="password"
                    autocomplete="new-password"
                    :label="t('user-create-page.label-password')"
                    :error-messages="showErrors ? formErrors.password : []"
                />
                <div class="flex flex-wrap gap-x-8">
                    <v-switch v-model="form.admin" :label="t('user-create-page.label-admin')" />
                    <v-switch v-model="form.active" :label="t('user-create-page.label-active')" />
                </div>
                <v-btn
                    type="submit"
                    color="primary"
                    size="large"
                    block
                    :loading="isSubmitting"
                    class="mt-2"
                >
                    {{ t('user-create-page.button-submit') }}
                </v-btn>
            </form>
            <div class="mt-4 flex justify-center">
                <v-btn variant="text" :to="routerLinkI18n({ name: 'UsersList' })">
                    {{ t('user-create-page.button-go-to-list') }}
                </v-btn>
            </div>
        </v-card>
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'UserCreatePage'
};
</script>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useUsersStore } from '@/features/users/store';
import { usersSchema, usersPasswordSchema } from '@/features/users/schemas.ts';
import { z } from 'zod';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import { notifyErrorMessages } from '@/utils/errors.ts';

/**
 * Generics
 */
const { t, locale } = useI18n();
const { addMessage } = useNotificationsStore();
const router = useRouter();

/**
 * Users store
 */
const { createUser } = useUsersStore();

/**
 * Form definition
 */
interface IUserCreateForm {
    email?: string;
    username?: string;
    password?: string;
    admin?: boolean;
    active?: boolean;
}

/**
 * Built once: the messages inside are thunks, resolved in the active language at parse time.
 */
const createSchema = usersSchema.pick({ email: true, username: true }).extend({
    password: usersPasswordSchema,
    admin: z.boolean().optional(),
    active: z.boolean().optional()
});

const { form, formErrors, isSubmitting, handleSubmit } =
    useStructureFormValidation<IUserCreateForm>({}, createSchema, { revalidateOn: locale });

/**
 * Whether to display validation errors in the UI
 */
const showErrors = ref(false);

/**
 * Validates the form and creates the user.
 *
 * @returns A promise resolving once the flow settles: on success a toast is
 *  shown and the new user's detail page is opened; on invalid input the errors
 *  are revealed; API failures are reported as toasts.
 */
const submitForm = () =>
    handleSubmit(async () => {
        const newUser = await createUser({
            email: form.value.email!,
            username: form.value.username!,
            password: form.value.password!,
            admin: form.value.admin,
            active: form.value.active
        });
        if (!newUser) return;
        addMessage(t('user-create-page.success-create'));
        router.push(routerLinkI18n({ name: 'UserTarget', params: { id: newUser.id } }));
    })
        .then((success) => {
            if (!success) showErrors.value = true;
        })
        .catch((error) => notifyErrorMessages(addMessage, error));
</script>
