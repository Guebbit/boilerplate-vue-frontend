<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'ProfileDeleteAccount'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Account-deletion trigger: a single confirm-then-request action chained through the app's
 * shared confirmation dialog before it calls the store. The account is locked at once and erased
 * after a grace, so success ends the local session and says when, on the page the visitor lands. Self-wrapped in its own card, like its
 * siblings in the bottom grid (`ProfileSessions`, `ProfileAddresses`) — the most destructive
 * control on the page, kept apart from the panels above it rather than sharing their card.
 *
 * The one action here blocks the visitor in place on failure (`useBlockingError`), next to the
 * button that started it, rather than a toast — see docs/theory/request-flow.md.
 */
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useProfileStore } from '../stores/profile.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { useDialogStore } from '@/ui/dialog.ts';
import { singleFlight } from '@/infrastructure/utils/single-flight.ts';
import { formatDate } from '@/infrastructure/utils/formatters.ts';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';

/**
 * Account deletion request with confirmation dialog.
 */
const { t } = useI18n();

/**
 * Router instance, for leaving the profile once the session is gone.
 */
const router = useRouter();

/**
 * Toast dispatcher, used to report every outcome to the visitor.
 */
const { addMessage } = useNotificationsStore();

/**
 * Locks the account and schedules its erasure; ends the local session on success.
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
 * Leaves the profile for Home and says when the account is erased: the session is already gone,
 * so the profile page has nothing left to show.
 *
 * @param schedule - The dates the API answered, when it sent any.
 * @param schedule.purgeAt - When the account is erased unless restored first.
 * @returns A promise resolving once the notice is shown.
 */
const leaveWithNotice = (schedule?: { purgeAt: string }) =>
    router
        .push(routerLinkI18n({ name: 'Home' }))
        .then(() =>
            addMessage(
                t('profile-page.deletion-scheduled', { date: formatDate(schedule?.purgeAt) })
            )
        );

/**
 * Starts the account deletion flow after an explicit confirmation.
 *
 * @returns Nothing; success sends the visitor Home with a toast naming the erasure date, a
 *  failure blocks in place ({@link deleteError}).
 */
const handleDeleteAccount = singleFlight(() =>
    useDialogStore()
        .confirm({ message: t('profile-page.confirm-delete-account'), color: 'error' })
        .then((accepted) => {
            if (!accepted) return;
            clearDeleteError();
            return requestAccountDelete()
                .then(leaveWithNotice)
                .catch((error) => reportDeleteError(error));
        })
);
</script>

<template>
    <v-card class="p-8" data-test="profile-delete-account">
        <v-btn color="error" variant="tonal" block @click="handleDeleteAccount">
            {{ t('profile-page.button-delete-account') }}
        </v-btn>

        <InlineErrorAlert
            :message="deleteError"
            class="mt-2"
            data-test="profile-delete-account-error"
        />
    </v-card>
</template>
