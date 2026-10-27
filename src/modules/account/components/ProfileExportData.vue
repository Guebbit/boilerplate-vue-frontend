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
 * Self-service GDPR export: one button, no confirm dialog (non-destructive, unlike its
 * `ProfileDeleteAccount` sibling), and no manual reauth handling — the server demands a fresh
 * session and the step-up interceptor prompts for it transparently. The data does not arrive
 * here: the API builds it in the background and mails a link to a download page
 * (`views/AccountExportDownload.vue`).
 *
 * The card reads the export's status on load, so a reload or another device still says
 * "building", "ready until" or "failed". While it builds, the status is polled.
 *
 * The button's own blocked state, next to it, replaces the toast on failure — see
 * docs/theory/request-flow.md.
 */
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { AccountExport } from '@types';
import { useProfileStore } from '../stores/profile.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { useAmbientError } from '@/infrastructure/utils/use-ambient-error.ts';
import { formatDate } from '@/infrastructure/utils/formatters.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';

/**
 * How long to wait between status reads while the export builds.
 */
const POLL_MS = 15_000;

/**
 * Generic translation accessor, plus the store actions asking for the export and reading it.
 */
const { t } = useI18n();

/**
 * Asks the API to build the visitor's own data export, and reads where it stands.
 */
const { requestAccountExport, fetchAccountExport } = useProfileStore();

/**
 * Where the export stands; `undefined` when there is none.
 */
const exportStatus = ref<AccountExport>();

/**
 * Toasts a background status read's failure: it has no form to host an inline error.
 */
const onAmbientError = useAmbientError();

/**
 * The pending status read, kept so it can be cancelled on unmount.
 */
let poller: ReturnType<typeof setTimeout> | undefined;

/**
 * This action's own blocked state, next to the button that triggered it.
 */
const {
    message: exportError,
    report: reportExportError,
    clear: clearExportError
} = useBlockingError();

/**
 * Takes a status in, and schedules the next read while it is still building.
 *
 * @param next - The export as the API last answered it.
 */
const adopt = (next: AccountExport | undefined) => {
    exportStatus.value = next;
    clearTimeout(poller);
    if (next?.status === 'building')
        poller = setTimeout(() => {
            refresh().catch(onAmbientError);
        }, POLL_MS);
};

/**
 * Counts the answers that decide the status. A read that started before a newer answer arrived
 * (the request's own) is stale and must not overwrite it.
 */
let epoch = 0;

/**
 * Reads the status once. A failed poll is toasted by the caller, not fatal: the next may succeed.
 *
 * @returns A promise resolving once the status is adopted.
 */
function refresh(): Promise<void> {
    const started = epoch;
    return fetchAccountExport().then((next) => {
        if (started === epoch) adopt(next);
    });
}

onMounted(() => {
    refresh().catch(onAmbientError);
});

onBeforeUnmount(() => {
    clearTimeout(poller);
});

/**
 * Asks for the export. Success shows the status the API answered (`building`); a failure blocks
 * in place ({@link exportError}).
 *
 * @returns A promise resolving once the request settles.
 */
const handleExport = () => {
    clearExportError();
    return requestAccountExport()
        .then((next) => {
            epoch += 1;
            adopt(next);
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
            v-if="exportStatus?.status === 'building'"
            type="info"
            density="compact"
            class="mt-2"
            data-test="profile-export-data-requested"
            :text="t('profile-page.export-requested')"
        />

        <v-alert
            v-else-if="exportStatus?.status === 'ready'"
            type="success"
            density="compact"
            class="mt-2"
            data-test="profile-export-data-ready"
            :text="t('profile-page.export-ready', { date: formatDate(exportStatus.expiresAt) })"
        />

        <v-alert
            v-else-if="exportStatus?.status === 'failed'"
            type="warning"
            density="compact"
            class="mt-2"
            data-test="profile-export-data-failed"
            :text="t('profile-page.export-failed')"
        />

        <InlineErrorAlert
            :message="exportError"
            class="mt-2"
            data-test="profile-export-data-error"
        />
    </v-card>
</template>
