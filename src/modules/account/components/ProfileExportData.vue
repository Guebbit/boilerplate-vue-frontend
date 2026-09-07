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
 */
import { useI18n } from 'vue-i18n';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { downloadBlob } from '@guebbit/js-toolkit';
import { useProfileStore } from '@/modules/account/stores/profile.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';

/**
 * Generic translation and notification accessors, plus the store action doing the fetch.
 */
const { t } = useI18n();

/**
 * Toast dispatcher, used to report every outcome to the visitor.
 */
const { addMessage } = useNotificationsStore();

/**
 * Requests the visitor's own data export.
 */
const { exportAccountData } = useProfileStore();

/**
 * Requests the export and saves it as a local JSON file, named by the day the API assembled it.
 *
 * @returns A promise resolving once the download has been triggered; a failed request surfaces
 *  as a toast instead.
 */
const handleExport = () =>
    exportAccountData()
        .then((data) => {
            if (!data) return;
            downloadBlob(
                JSON.stringify(data, null, 2),
                `account-export-${data.exportedAt.slice(0, 10)}.json`,
                'application/json'
            );
        })
        .catch((error: unknown) => notifyErrorMessages(addMessage, error));
</script>

<template>
    <v-card class="p-8" data-test="profile-export-data">
        <v-btn variant="tonal" block @click="handleExport">
            {{ t('profile-page.button-export-data') }}
        </v-btn>
    </v-card>
</template>
