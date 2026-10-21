<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'EmailChangeConfirmPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Public confirm page for an email change: the token mailed to the NEW address is the credential.
 * The server checks it as a different token type from the verify-email confirm, never the
 * other's, but the form is the same `LinkTokenConfirmCard`.
 * Success lands on Home, where a live session shows the new address.
 */
import { useProfileStore } from '../stores/profile.ts';
import LinkTokenConfirmCard from '../components/LinkTokenConfirmCard.vue';

/**
 * Confirms the new address against the emailed token.
 */
const { confirmEmailChange } = useProfileStore();

/**
 * This page's translation keys.
 */
const copy = {
    intro: 'email-change-confirm-page.intro',
    label: 'email-change-confirm-page.label-token',
    submit: 'email-change-confirm-page.button-submit',
    tokenRequired: 'email-change-confirm-page.token-required',
    success: 'email-change-confirm-page.success'
};

/**
 * This page's `data-test` hooks.
 */
const testIds = {
    token: 'email-change-token',
    submit: 'email-change-submit',
    error: 'email-change-confirm-error'
};
</script>

<template>
    <div id="email-change-confirm-page">
        <LinkTokenConfirmCard
            :copy="copy"
            :test-ids="testIds"
            :spend="confirmEmailChange"
            success-route="Home"
        />
    </div>
</template>
