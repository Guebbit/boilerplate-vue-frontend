<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'ProfileExportData'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Self-service GDPR export trigger: one button, no confirm dialog (non-destructive, unlike its
 * `ProfileDeleteAccount` sibling), and no manual reauth handling — the server demands a fresh
 * session and the step-up interceptor prompts for it transparently. The data does not arrive
 * here: the API builds it in the background and mails a link to a download page
 * (`views/AccountExportDownload.vue`), so a click only confirms the request was accepted.
 *
 * The button's own blocked state, next to it, replaces the toast on failure — see
 * docs/theory/request-flow.md.
 */
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useProfileStore } from '@/modules/account/stores/profile.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';

/**
 * Generic translation accessor, plus the store action asking for the export.
 */
const { t } = useI18n();

/**
 * Asks the API to build the visitor's own data export.
 */
const { requestAccountExport } = useProfileStore();

/**
 * Whether the request was accepted, to tell the visitor a link is on its way.
 */
const requested = ref(false);

/**
 * This action's own blocked state, next to the button that triggered it.
 */
const {
    message: exportError,
    report: reportExportError,
    clear: clearExportError
} = useBlockingError();

/**
 * Asks for the export. Success is the "we will email you a link" note; a failure blocks in place
 * ({@link exportError}).
 *
 * @returns A promise resolving once the request settles.
 */
const handleExport = () => {
    clearExportError();
    requested.value = false;
    return requestAccountExport()
        .then(() => {
            requested.value = true;
        })
        .catch((error: unknown) => reportExportError(error));
};
</script>

<template>
    <v-card class="p-8" data-test="profile-export-data">
        <v-btn variant="tonal" block @click="handleExport">
            {{ t('profile-page.button-export-data') }}
        </v-btn>

        <v-alert
            v-if="requested"
            type="success"
            density="compact"
            class="mt-2"
            data-test="profile-export-data-requested"
            :text="t('profile-page.export-requested')"
        />

        <InlineErrorAlert
            :message="exportError"
            class="mt-2"
            data-test="profile-export-data-error"
        />
    </v-card>
</template>
