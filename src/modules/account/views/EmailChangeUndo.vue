<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'EmailChangeUndoPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Public undo page for an email change: the link goes to the OLD address, and its token (its own
 * type server-side) is the credential. The form is `LinkTokenConfirmCard`. Success lands on Login: the server ended every session, so there is
 * nothing signed in to return to.
 */
import { useProfileStore } from '../stores/profile.ts';
import LinkTokenConfirmCard from '../components/LinkTokenConfirmCard.vue';

/**
 * Spends the undo token.
 */
const { undoEmailChange } = useProfileStore();

/**
 * This page's translation keys.
 */
const copy = {
    intro: 'email-change-undo-page.intro',
    label: 'email-change-undo-page.label-token',
    submit: 'email-change-undo-page.button-submit',
    tokenRequired: 'email-change-undo-page.token-required',
    success: 'email-change-undo-page.success'
};

/**
 * This page's `data-test` hooks.
 */
const testIds = {
    token: 'email-change-undo-token',
    submit: 'email-change-undo-submit',
    error: 'email-change-undo-error'
};
</script>

<template>
    <div id="email-change-undo-page">
        <LinkTokenConfirmCard
            :copy="copy"
            :test-ids="testIds"
            :spend="undoEmailChange"
            success-route="Login"
        />
    </div>
</template>
