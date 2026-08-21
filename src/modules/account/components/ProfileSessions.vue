<script lang="ts">
export default {
    name: 'ProfileSessions'
};
</script>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { MonitorSmartphone } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useAccountStore } from '@/modules/account/store.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { formatDateTime } from '@/infrastructure/utils/formatters.ts';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import { useDialogStore } from '@/infrastructure/stores/dialog.ts';

/**
 * The devices panel: every live refresh token as a session, the current one flagged, each
 * individually revocable — plus the everything-at-once button for the day a credential leaks.
 *
 * Revoking the CURRENT session from here is allowed (the API treats it as a logout), so the
 * page navigates home afterwards rather than leaving a signed-out shell on screen.
 */
const { t } = useI18n();
const router = useRouter();
const { addMessage } = useNotificationsStore();
const { fetchSessions, revokeSession, logoutEverywhere } = useAccountStore();
const { sessions } = storeToRefs(useAccountStore());

/**
 * The session currently being revoked, if any.
 *
 * Per row rather than the store's page-wide `loading`: that flag rises for every account request
 * this page makes, so binding it here put EVERY revoke button into Vuetify's loading state
 * whenever anything on the profile fetched — spinners on controls nobody had touched, and their
 * labels dimmed below the contrast threshold while they said it.
 */
const revokingId = ref<string>();

/**
 * Revokes one session; leaving through the front door when it was this one.
 *
 * @param sessionId - Handle from the listing.
 * @param current - Whether the caller just logged themselves out.
 * @returns Nothing; the outcome is reported as a toast.
 */
const handleRevoke = (sessionId: string, current: boolean) => {
    revokingId.value = sessionId;
    return revokeSession(sessionId)
        .then(() => {
            addMessage(t('profile-page.sessions-revoked'));
            if (current) return router.push(routerLinkI18n({ name: 'Logout' }));
        })
        .catch((error) => notifyErrorMessages(addMessage, error))
        .finally(() => {
            revokingId.value = undefined;
        });
};

/**
 * Ends every session after an explicit confirmation, then leaves.
 *
 * @returns Nothing; the outcome is reported as a toast.
 */
const handleLogoutEverywhere = () =>
    useDialogStore()
        .confirm({ message: t('profile-page.sessions-confirm-logout-everywhere'), color: 'error' })
        .then((accepted) => {
            if (!accepted) return;
            return logoutEverywhere()
                .then(() => router.push(routerLinkI18n({ name: 'Home' })))
                .catch((error) => notifyErrorMessages(addMessage, error));
        });

onMounted(fetchSessions);
</script>

<template>
    <v-card class="p-8" data-test="profile-sessions">
        <div class="mb-4 flex items-center gap-2">
            <MonitorSmartphone :size="20" aria-hidden="true" />
            <h3 class="text-lg font-semibold">{{ t('profile-page.sessions-title') }}</h3>
        </div>

        <p class="mb-4 opacity-80">{{ t('profile-page.sessions-intro') }}</p>

        <v-list v-if="sessions.length > 0" density="compact" data-test="sessions-list">
            <v-list-item
                v-for="session in sessions"
                :key="'session-' + session.id"
                data-test="session-item"
            >
                <v-list-item-title class="flex flex-wrap items-center gap-2">
                    <code class="text-xs opacity-70">{{ session.id }}</code>
                    <v-chip
                        v-if="session.current"
                        size="small"
                        color="primary"
                        data-test="session-current"
                    >
                        {{ t('profile-page.sessions-current') }}
                    </v-chip>
                </v-list-item-title>
                <v-list-item-subtitle v-if="session.expiration" class="session-expiry">
                    {{ t('profile-page.sessions-expires') }}:
                    {{ formatDateTime(session.expiration) }}
                </v-list-item-subtitle>
                <template #append>
                    <v-btn
                        variant="text"
                        color="error"
                        size="small"
                        data-test="session-revoke"
                        :loading="revokingId === session.id"
                        @click="handleRevoke(session.id, session.current)"
                    >
                        {{ t('profile-page.sessions-revoke') }}
                    </v-btn>
                </template>
            </v-list-item>
        </v-list>

        <v-btn
            color="error"
            variant="tonal"
            block
            class="mt-4"
            data-test="sessions-logout-everywhere"
            @click="handleLogoutEverywhere"
        >
            {{ t('profile-page.sessions-logout-everywhere') }}
        </v-btn>
    </v-card>
</template>

<style scoped>
/*
 * Vuetify renders a list subtitle at `--v-medium-emphasis-opacity` (0.6). On this card's surface
 * that lands under the 4.5:1 WCAG AA threshold, and `account/tests/e2e/a11y.cy.ts` fails on it —
 * the one string it dims below legibility being the one that says when you will be signed out.
 *
 * The TOKEN is raised rather than `opacity` overridden, because Vuetify owns what emphasis means
 * here and a hard-coded value would be a second answer to the same question. Scoped, so no other
 * subtitle in the app inherits a decision made for this list.
 */
.session-expiry {
    --v-medium-emphasis-opacity: 1;
}
</style>
