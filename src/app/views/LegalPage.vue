<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'LegalPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The Legal notice: who the seller is, in full. The identity comes from `GET /shop`, so a
 * deployment sets it once in `NODE_SHOP_*` and every page that shows it stays in step. The page
 * carries no prose of its own beyond a one-line introduction.
 */
import { useI18n } from 'vue-i18n';
import SellerIdentityBlock from '@/app/components/SellerIdentityBlock.vue';
import StaticPageLinks from '@/app/components/StaticPageLinks.vue';

/**
 * Translation function for the introduction.
 */
const { t } = useI18n();
</script>

<template>
    <div id="static-page-legal">
        <v-card class="mx-auto mt-10 w-full max-w-2xl p-8">
            <p class="mb-4">{{ t('static-pages.legal.intro') }}</p>

            <SellerIdentityBlock />

            <StaticPageLinks current="legal" />
        </v-card>
    </div>
</template>
