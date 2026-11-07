<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'TermsPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Dedicated terms-of-service page, its own component rather than a shared paragraph renderer — real legal copy
 * needs its own structure (headings, lists, numbered clauses) that the shared paragraph
 * renderer does not support. Opens with the operator's identity, read from `GET /config`, then a
 * placeholder the operator replaces before going live: this repository ships no legal wording.
 */
import { useI18n } from 'vue-i18n';
import { publicConfig } from '@/infrastructure/config.ts';
import LegalPlaceholder from '@/app/components/LegalPlaceholder.vue';
import OperatorIdentityBlock from '@/app/components/OperatorIdentityBlock.vue';
import StaticPageLinks from '@/app/components/StaticPageLinks.vue';

/**
 * Translation function for the version line.
 */
const { t } = useI18n();
</script>

<template>
    <div id="static-page-terms">
        <v-card class="mx-auto mt-10 w-full max-w-2xl p-8">
            <OperatorIdentityBlock />

            <p v-if="publicConfig" class="mb-4 text-sm opacity-75" data-test="terms-version">
                {{ t('static-pages.terms.version', { version: publicConfig.termsVersion }) }}
            </p>

            <LegalPlaceholder page="terms" />

            <StaticPageLinks current="terms" />
        </v-card>
    </div>
</template>
