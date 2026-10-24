<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'AccountRestoreChallengePage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The last step of a sign-in by an account in the grace of its own deletion: the credentials
 * checked out, no session exists yet, and the visitor either restores the account (the claim
 * check is redeemed, a session starts, they land where a plain login would) or leaves it to be
 * erased. Guest route; a visitor who arrives with no offer (a reload, a bookmark) is sent back to
 * `Login`.
 */
import { onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useDeletionRestoreStore } from '../stores/deletion-restore.ts';
import { usePostLoginRedirect } from '../composables/use-post-login-redirect.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { formatDate } from '@/infrastructure/utils/formatters.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { routerLinkI18n } from '@/i18n/router-link.ts';

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Router instance, for the navigations this file performs.
 */
const router = useRouter();

/**
 * The deletion-restore store, held whole: its actions and its `storeToRefs` slice are both read.
 */
const restore = useDeletionRestoreStore();

/**
 * The offer on screen, and whether a call is in flight.
 */
const { pending, loading } = storeToRefs(restore);

/**
 * Sends the visitor wherever they were headed before the login wall.
 */
const { redirectAfterLogin } = usePostLoginRedirect();

/**
 * The restore button's own blocked state: a spent or expired claim check names no field.
 */
const {
    message: restoreError,
    report: reportRestoreError,
    clear: clearRestoreError
} = useBlockingError();

/**
 * Leaves for `Login` when there is no offer to answer: nothing here can be recovered.
 */
onMounted(() => {
    if (!pending.value) void router.replace(routerLinkI18n({ name: 'Login' }));
});

/**
 * Redeems the claim check: restores the account and starts the session.
 *
 * @returns Nothing; a refusal blocks in place ({@link restoreError}).
 */
const handleRestore = () => {
    clearRestoreError();
    return restore
        .restoreAndSignIn()
        .then(() => redirectAfterLogin())
        .then(() => undefined)
        .catch((error: unknown) => reportRestoreError(error));
};

/**
 * Walks away: drops the offer and goes Home. The account stays locked and is erased on schedule.
 *
 * @returns A promise resolving once the navigation settles.
 */
const handleLeave = () => {
    restore.clear();
    return router.push(routerLinkI18n({ name: 'Home' })).then(() => undefined);
};

// A spent or abandoned offer must not survive to the next visit to this route.
onUnmounted(restore.clear);
</script>

<template>
    <div v-if="pending" id="account-restore-challenge-page">
        <v-card class="mx-auto mt-16 w-full max-w-md p-8">
            <h1 class="mb-2 text-xl">{{ t('account-restore-challenge-page.title') }}</h1>
            <p class="mb-6 opacity-80">
                {{
                    t('account-restore-challenge-page.intro', {
                        date: formatDate(pending.purgeAt)
                    })
                }}
            </p>

            <v-btn
                color="primary"
                size="large"
                block
                :loading="loading"
                data-test="account-restore-challenge-restore"
                @click="handleRestore"
            >
                {{ t('account-restore-challenge-page.button-restore') }}
            </v-btn>
            <InlineErrorAlert
                :message="restoreError"
                class="mt-2"
                data-test="account-restore-challenge-error"
            />

            <v-btn
                variant="text"
                block
                class="mt-4"
                :disabled="loading"
                data-test="account-restore-challenge-leave"
                @click="handleLeave"
            >
                {{ t('account-restore-challenge-page.button-leave') }}
            </v-btn>
        </v-card>
    </div>
</template>
