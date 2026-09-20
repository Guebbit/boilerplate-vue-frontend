<script lang="ts">
export default {
    name: 'ProfileDeleteAccount'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Account-deletion trigger: a single confirm-then-request action chained through the app's
 * shared confirmation dialog before it calls the store. Self-wrapped in its own card, like its
 * siblings in the bottom grid (`ProfileSessions`, `ProfileAddresses`) — the most destructive
 * control on the page, moved out of the panels above it rather than sharing their card.
 *
 * The one action here blocks the visitor in place on failure (`useBlockingError`), next to the
 * button that started it, rather than a toast — see docs/theory/request-flow.md.
 */
import { useI18n } from 'vue-i18n';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useProfileStore } from '@/modules/account/stores/profile.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { useDialogStore } from '@/ui/dialog.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';

/**
 * Account deletion request with confirmation dialog.
 */
const { t } = useI18n();

/**
 * Toast dispatcher, used to report every outcome to the visitor.
 */
const { addMessage } = useNotificationsStore();

/**
 * Starts the account-deletion flow, which finishes at an emailed confirmation link.
 */
const { requestAccountDelete } = useProfileStore();

/**
 * This action's own blocked state — the confirmation dialog closes before the request answers,
 * so a failure has nowhere else to go but here, next to the button that started it.
 */
const {
    message: deleteError,
    report: reportDeleteError,
    clear: clearDeleteError
} = useBlockingError();

/**
 * Starts the account deletion flow after an explicit confirmation.
 *
 * @returns Nothing; success is toasted, a failure blocks in place ({@link deleteError}).
 */
const handleDeleteAccount = () =>
    useDialogStore()
        .confirm({ message: t('profile-page.confirm-delete-account'), color: 'error' })
        .then((accepted) => {
            if (!accepted) return;
            clearDeleteError();
            return requestAccountDelete()
                .then(() => addMessage(t('profile-page.success-delete-request')))
                .catch((error) => reportDeleteError(error));
        });
</script>

<template>
    <v-card class="p-8" data-test="profile-delete-account">
        <v-btn color="error" variant="tonal" block @click="handleDeleteAccount">
            {{ t('profile-page.button-delete-account') }}
        </v-btn>

        <InlineErrorAlert
            :message="deleteError"
            class="mt-2"
            test-id="profile-delete-account-error"
        />
    </v-card>
</template>
