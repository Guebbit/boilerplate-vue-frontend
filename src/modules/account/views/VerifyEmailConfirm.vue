<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'VerifyEmailConfirmPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Public confirm page for email verification: the emailed token is the credential, and the visitor
 * following the link is not necessarily signed in. The form itself is `LinkTokenConfirmCard`; this
 * page names the store call, its wording and where success lands (Home, where a live session shows
 * the banner gone).
 */
import { useProfileStore } from '../stores/profile.ts';
import LinkTokenConfirmCard from '../components/LinkTokenConfirmCard.vue';

/**
 * Confirms the address against the emailed token.
 */
const { confirmEmailVerification } = useProfileStore();

/**
 * This page's translation keys.
 */
const copy = {
    intro: 'verify-email-confirm-page.intro',
    label: 'verify-email-confirm-page.label-token',
    submit: 'verify-email-confirm-page.button-submit',
    tokenRequired: 'verify-email-confirm-page.token-required',
    success: 'verify-email-confirm-page.success'
};

/**
 * This page's `data-test` hooks.
 */
const testIds = {
    token: 'verify-token',
    submit: 'verify-submit',
    error: 'verify-email-confirm-error'
};
</script>

<template>
    <div id="verify-email-confirm-page">
        <LinkTokenConfirmCard
            :copy="copy"
            :test-ids="testIds"
            :spend="confirmEmailVerification"
            success-route="Home"
        />
    </div>
</template>
