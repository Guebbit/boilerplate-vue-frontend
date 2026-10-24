<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'AccountRestorePage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Public page the "your account is scheduled for deletion" email links to: the one-time token is
 * the credential, so the route carries no auth guard and works for a signed-out visitor. The form
 * is `LinkTokenConfirmCard` in its ordinary (non-destructive) tone; restoring signs nobody in, so
 * success lands on the login page.
 */
import { useProfileStore } from '../stores/profile.ts';
import LinkTokenConfirmCard from '../components/LinkTokenConfirmCard.vue';

/**
 * Cancels the deletion the emailed link was sent for.
 */
const { restoreAccount } = useProfileStore();

/**
 * This page's translation keys.
 */
const copy = {
    intro: 'account-restore-page.intro-message',
    label: 'account-restore-page.label-token',
    submit: 'account-restore-page.button-submit',
    tokenRequired: 'account-restore-page.token-required',
    success: 'account-restore-page.success'
};

/**
 * This page's `data-test` hooks.
 */
const testIds = {
    token: 'account-restore-token',
    submit: 'account-restore-submit',
    error: 'account-restore-error'
};
</script>

<template>
    <div id="account-restore-page">
        <LinkTokenConfirmCard
            :copy="copy"
            :test-ids="testIds"
            :spend="restoreAccount"
            success-route="Login"
        />
    </div>
</template>
