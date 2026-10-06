<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'ProfileConnectedAccounts'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Connected-accounts panel: the sign-in providers (Google, GitHub) linked to this account, each
 * removable behind a confirmation. Removing one is a sensitive action, so the server answers a
 * stale session with the shared step-up challenge and the interceptor's prompt handles it — this
 * panel never asks for a password itself. There is no "last method" guard: forgot-password
 * recovers an account left with none, by the backend's own decision.
 */
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { Link2 } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useOAuthLinksStore } from '@/modules/account/stores/oauth-links.ts';
import { providerLabel } from '@/modules/account/stores/oauth.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { formatDateTime } from '@/infrastructure/utils/formatters.ts';
import { useDialogStore } from '@/ui/dialog.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Toast dispatcher, used to report the outcome to the visitor.
 */
const { addMessage } = useNotificationsStore();

/**
 * The link-list actions: load them, and remove one.
 */
const { fetchLinks, unlinkProvider } = useOAuthLinksStore();

/**
 * The connected providers.
 */
const { links } = storeToRefs(useOAuthLinksStore());

/**
 * The provider being removed, if any — per row, so only that button spins.
 */
const removing = ref<string>();

/**
 * This panel's own blocked state: a failed removal shows above the list, which keeps working.
 */
const {
    message: actionError,
    report: reportActionError,
    clear: clearActionError
} = useBlockingError();

/**
 * Removes one provider after an explicit confirmation.
 *
 * @param provider - Registry key of the link to remove.
 * @returns Nothing; success is toasted, a failure blocks the list in place ({@link actionError}).
 */
const handleRemove = (provider: string) =>
    useDialogStore()
        .confirm({
            message: t('profile-page.connected-confirm-remove', {
                provider: providerLabel(provider)
            }),
            color: 'error'
        })
        .then((accepted) => {
            if (!accepted) return;
            removing.value = provider;
            clearActionError();
            return unlinkProvider(provider)
                .then(() => {
                    addMessage(t('profile-page.connected-removed'));
                })
                .catch((error) => reportActionError(error))
                .finally(() => {
                    removing.value = undefined;
                });
        });

onMounted(fetchLinks);
</script>

<template>
    <v-card class="p-8" data-test="profile-connected-accounts">
        <div class="mb-4 flex items-center gap-2">
            <Link2 :size="20" aria-hidden="true" />
            <h2 class="text-lg font-semibold">{{ t('profile-page.connected-title') }}</h2>
        </div>

        <p class="mb-4 opacity-80">{{ t('profile-page.connected-intro') }}</p>

        <InlineErrorAlert :message="actionError" class="mb-4" data-test="connected-action-error" />

        <v-list v-if="links.length > 0" density="compact" data-test="connected-list">
            <v-list-item
                v-for="link in links"
                :key="'link-' + link.provider"
                data-test="connected-item"
            >
                <v-list-item-title>{{ providerLabel(link.provider) }}</v-list-item-title>
                <v-list-item-subtitle class="connected-since">
                    {{ t('profile-page.connected-since') }}: {{ formatDateTime(link.connectedAt) }}
                </v-list-item-subtitle>
                <template #append>
                    <v-btn
                        variant="text"
                        color="error"
                        size="small"
                        data-test="connected-remove"
                        :aria-label="
                            t('profile-page.connected-remove-named', {
                                provider: providerLabel(link.provider)
                            })
                        "
                        :loading="removing === link.provider"
                        @click="handleRemove(link.provider)"
                    >
                        {{ t('profile-page.connected-remove') }}
                    </v-btn>
                </template>
            </v-list-item>
        </v-list>
        <p v-else class="opacity-80" data-test="connected-empty">
            {{ t('profile-page.connected-empty') }}
        </p>
    </v-card>
</template>

<style scoped>
/*
 * The same contrast raise `ProfileSessions.vue` applies to its list subtitles: Vuetify's 0.6
 * medium emphasis lands under 4.5:1 on this card's surface, and the date is what the visitor
 * is here to read.
 */
.connected-since {
    --v-medium-emphasis-opacity: 1;
}
</style>
