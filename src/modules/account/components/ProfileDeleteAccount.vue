<script lang="ts">
export default {
    name: 'ProfileDeleteAccount'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Account-deletion trigger: a single confirm-then-request action chained through the app's
 * shared confirmation dialog before it calls the store.
 */
import { useI18n } from 'vue-i18n';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useProfileStore } from '@/modules/account/stores/profile.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { useDialogStore } from '@/ui/dialog.ts';

/**
 * Account deletion request with confirmation dialog.
 */
const { t } = useI18n();
const { addMessage } = useNotificationsStore();
const { requestAccountDelete } = useProfileStore();

/**
 * Starts the account deletion flow after an explicit confirmation.
 *
 * @returns Nothing; a toast reports either that the confirmation email was sent
 *  or why the request failed.
 */
const handleDeleteAccount = () =>
    useDialogStore()
        .confirm({ message: t('profile-page.confirm-delete-account'), color: 'error' })
        .then((accepted) => {
            if (!accepted) return;
            return requestAccountDelete()
                .then(() => addMessage(t('profile-page.success-delete-request')))
                .catch((error) => notifyErrorMessages(addMessage, error));
        });
</script>

<template>
    <v-divider class="my-6" />

    <v-btn color="error" variant="tonal" block @click="handleDeleteAccount">
        {{ t('profile-page.button-delete-account') }}
    </v-btn>
</template>
