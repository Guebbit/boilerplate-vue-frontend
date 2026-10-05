<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'AccountExportDownloadPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The page the "your data export is ready" mail links to. It needs a signed-in session (the route
 * is `auth`, and the download route asks for a FRESH one — the step-up interceptor prompts for it
 * transparently), so a forwarded mail hands nobody the file.
 *
 * A button, not a download on mount: a mail scanner that prefetches the link must not be the one
 * to trigger it, and a browser is more willing to save a file the visitor asked for.
 */
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { downloadBlob } from '@guebbit/js-toolkit';
import { useProfileStore } from '@/modules/account/stores/profile.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { absentIs } from '@/infrastructure/utils/errors.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Current route, read for the export id the mailed link carries.
 */
const route = useRoute();

/**
 * Fetches the finished export.
 */
const { downloadAccountExport } = useProfileStore();

/**
 * This page's own blocked state — a failed download lands here, next to the button that asked.
 * A 404 covers an export that is gone (past its retention, replaced), still `building`, `failed`
 * or not this account's: the API does not tell them apart, by design.
 */
const {
    message: downloadError,
    report: reportDownloadError,
    clear: clearDownloadError
} = useBlockingError();

/**
 * Whether the file has been saved, to say so.
 */
const saved = ref(false);

/**
 * Whether the last failure was the API's 404, the only one the "kept for a few days" hint explains.
 */
const exportGone = ref(false);

/**
 * Whether a download is in flight.
 */
const downloading = ref(false);

/**
 * The export id from the link: a route param, never trusted to be one string.
 */
const exportId = typeof route.params.id === 'string' ? route.params.id : '';

/**
 * Fetches the export and saves it as a local JSON file, named by the day it was assembled.
 *
 * @returns A promise resolving once the file is saved; a failure blocks in place
 *  ({@link downloadError}).
 */
const handleDownload = () => {
    clearDownloadError();
    exportGone.value = false;
    saved.value = false;
    downloading.value = true;
    return downloadAccountExport(exportId)
        .then((data) => {
            // A success with no body: nothing to save, and nothing to claim was saved.
            if (!data) return;
            // js-toolkit `downloadBlob(data, filename, type)`: wraps the string in a Blob of
            // MIME `type` and saves it under `filename` through a throwaway link.
            downloadBlob(
                JSON.stringify(data, null, 2),
                `account-export-${data.exportedAt.slice(0, 10)}.json`,
                'application/json'
            );
            saved.value = true;
        })
        .catch((error: unknown) => {
            exportGone.value = absentIs(error, 404);
            reportDownloadError(error);
        })
        .finally(() => {
            downloading.value = false;
        });
};
</script>

<template>
    <div id="account-export-download-page">
        <v-card class="mx-auto mt-10 w-full max-w-md p-8">
            <p class="mb-4 opacity-80">{{ t('account-export-page.intro') }}</p>
            <v-btn
                color="primary"
                block
                data-test="account-export-download"
                :loading="downloading"
                :disabled="downloading"
                @click="handleDownload"
            >
                {{ t('account-export-page.button-download') }}
            </v-btn>
            <v-alert
                v-if="saved"
                type="success"
                density="compact"
                class="mt-4"
                data-test="account-export-saved"
                :text="t('account-export-page.saved')"
            />
            <InlineErrorAlert
                :message="downloadError"
                class="mt-4"
                data-test="account-export-error"
            />
            <p v-if="downloadError && exportGone" class="mt-2 opacity-80">
                {{ t('account-export-page.gone-hint') }}
            </p>
        </v-card>
    </div>
</template>
