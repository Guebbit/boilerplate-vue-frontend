<script lang="ts">
export default {
    name: 'ProfileExportData'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Self-service GDPR export trigger: one button, no confirm dialog (non-destructive, unlike its
 * `ProfileDeleteAccount` sibling), and no manual reauth handling — the server demands a fresh
 * session and the step-up interceptor prompts for it transparently. The result downloads as a
 * timestamped JSON file rather than rendering anywhere, since a raw personal-data export has no
 * UI worth building for it.
 *
 * The button's own blocked state, next to it, replaces the toast on failure — see
 * docs/theory/request-flow.md.
 */
import { useI18n } from 'vue-i18n';
import { downloadBlob } from '@guebbit/js-toolkit';
import { useProfileStore } from '@/modules/account/stores/profile.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';

/**
 * Generic translation accessor, plus the store action doing the fetch.
 */
const { t } = useI18n();

/**
 * Requests the visitor's own data export.
 */
const { exportAccountData } = useProfileStore();

/**
 * This action's own blocked state, next to the button that triggered it.
 */
const {
    message: exportError,
    report: reportExportError,
    clear: clearExportError
} = useBlockingError();

/**
 * Requests the export and saves it as a local JSON file, named by the day the API assembled it.
 *
 * @returns A promise resolving once the download has been triggered; a failure blocks in place
 *  ({@link exportError}).
 */
const handleExport = () => {
    clearExportError();
    return exportAccountData()
        .then((data) => {
            if (!data) return;
            downloadBlob(
                JSON.stringify(data, null, 2),
                `account-export-${data.exportedAt.slice(0, 10)}.json`,
                'application/json'
            );
        })
        .catch((error: unknown) => reportExportError(error));
};
</script>

<template>
    <v-card class="p-8" data-test="profile-export-data">
        <v-btn variant="tonal" block @click="handleExport">
            {{ t('profile-page.button-export-data') }}
        </v-btn>

        <InlineErrorAlert :message="exportError" class="mt-2" test-id="profile-export-data-error" />
    </v-card>
</template>
