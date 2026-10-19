<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'BrowserStorageTable'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The "Cookies and storage" section of the privacy page (`#cookies`): every cookie and storage key
 * the app leaves in the browser, one row each, rendered from `infrastructure/browser-storage.ts`.
 * It is real content generated from code, not placeholder text, so it stays when the operator
 * replaces the placeholder above it. The purpose and lifetime cells are translation keys, which
 * admins can override at runtime like any other text. A third party that loads on some forms
 * (Cloudflare Turnstile) is named under the table when the shop uses it.
 */
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
    BROWSER_STORAGE_NAME,
    browserStorageFor,
    type BrowserStorageItem
} from '@/infrastructure/browser-storage.ts';
import { isAnalyticsConsentEnabled } from '@/infrastructure/analytics-consent.ts';
import { readFaroConfig } from '@/infrastructure/observability/config.ts';
import { fetchAntibotConfig } from '@/infrastructure/http/antibot.ts';
import { logger } from '@/infrastructure/utils/logger.ts';

/**
 * Translation function for the column labels, the cell wording and the rows' own keys.
 */
const { t } = useI18n();

/**
 * The items this deployment can hold: an item tied to analytics or crash reports is left out when
 * the shop configured neither, so the page never lists a cookie the shop cannot set.
 */
const items: BrowserStorageItem[] = browserStorageFor({
    analytics: isAnalyticsConsentEnabled(),
    faro: readFaroConfig() !== undefined
});

/**
 * Whether the human check is Cloudflare Turnstile, which makes Cloudflare a third party on some
 * forms. Unknown until the public config answers; a failed read leaves the note out.
 */
const usesTurnstile = ref(false);

onMounted(() => {
    fetchAntibotConfig()
        .then((envelope) => {
            usesTurnstile.value = envelope.data.provider === 'turnstile';
        })
        .catch((error: unknown) => {
            logger.debug('http', '[Cookies] human-check provider not read', error);
        });
});

/**
 * The key an item's text lives under.
 *
 * @param item - The item.
 * @param cell - Which cell of its row.
 * @returns The translation key.
 */
const rowKey = (item: BrowserStorageItem, cell: 'purpose' | 'lifetime'): string =>
    `browser-storage.rows.${item.id}.${cell}`;
</script>

<template>
    <section id="cookies" data-test="browser-storage" class="mt-6">
        <h2 class="mb-2 text-xl font-bold">{{ t('browser-storage.title') }}</h2>
        <p class="mb-4">{{ t('browser-storage.intro') }}</p>

        <div>
            <v-table v-focusable-scroll="t('browser-storage.title')" density="compact">
                <thead>
                    <tr>
                        <th scope="col">{{ t('browser-storage.columns.name') }}</th>
                        <th scope="col">{{ t('browser-storage.columns.kind') }}</th>
                        <th scope="col">{{ t('browser-storage.columns.setter') }}</th>
                        <th scope="col">{{ t('browser-storage.columns.party') }}</th>
                        <th scope="col">{{ t('browser-storage.columns.purpose') }}</th>
                        <th scope="col">{{ t('browser-storage.columns.lifetime') }}</th>
                        <th scope="col">{{ t('browser-storage.columns.necessity') }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="item in items" :key="item.id" :data-test="`storage-row-${item.id}`">
                        <th scope="row">
                            <code>{{ BROWSER_STORAGE_NAME[item.id] }}</code>
                            <span v-if="item.id === 'checkoutDraft'">
                                {{ t('browser-storage.checkout-draft-suffix') }}
                            </span>
                        </th>
                        <td>{{ t(`browser-storage.kind.${item.kind}`) }}</td>
                        <td>{{ t(`browser-storage.setter.${item.setter}`) }}</td>
                        <td>{{ t(`browser-storage.party.${item.party}`) }}</td>
                        <td>{{ t(rowKey(item, 'purpose')) }}</td>
                        <td>{{ t(rowKey(item, 'lifetime')) }}</td>
                        <td>{{ t(`browser-storage.necessity.${item.necessity}`) }}</td>
                    </tr>
                </tbody>
            </v-table>
        </div>

        <p v-if="usesTurnstile" class="mt-4" data-test="browser-storage-turnstile">
            {{ t('browser-storage.turnstile') }}
        </p>
    </section>
</template>
