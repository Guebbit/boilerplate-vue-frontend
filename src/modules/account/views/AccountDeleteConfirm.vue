<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'AccountDeleteConfirmPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Public confirm page for account deletion: the one-time token from the email link is the
 * credential, so the route carries no auth guard and the form works for a signed-out visitor too.
 * The form is `LinkTokenConfirmCard`, in its destructive tone with a way back to the profile.
 */
import { useProfileStore } from '../stores/profile.ts';
import LinkTokenConfirmCard from '../components/LinkTokenConfirmCard.vue';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { useI18n } from 'vue-i18n';

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Finishes the deletion the emailed link started.
 */
const { confirmAccountDelete } = useProfileStore();

/**
 * This page's translation keys.
 */
const copy = {
    warning: 'account-delete-confirm-page.warning-message',
    label: 'account-delete-confirm-page.label-token',
    submit: 'account-delete-confirm-page.button-submit',
    tokenRequired: 'account-delete-confirm-page.token-required',
    success: 'account-delete-confirm-page.success'
};

/**
 * This page's `data-test` hooks.
 */
const testIds = {
    token: 'account-delete-confirm-token',
    submit: 'account-delete-confirm-submit',
    error: 'account-delete-confirm-error'
};
</script>

<template>
    <div id="account-delete-confirm-page">
        <LinkTokenConfirmCard
            :copy="copy"
            :test-ids="testIds"
            :spend="confirmAccountDelete"
            success-route="Home"
            destructive
        >
            <template #footer>
                <div class="mt-4 flex justify-center">
                    <v-btn variant="text" :to="routerLinkI18n({ name: 'Profile' })">
                        {{ t('account-delete-confirm-page.button-go-back') }}
                    </v-btn>
                </div>
            </template>
        </LinkTokenConfirmCard>
    </div>
</template>
