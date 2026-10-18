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
 * renderer does not support. Opens with the seller's identity, read from `GET /shop`, then a
 * placeholder the operator replaces before going live: this repository ships no legal wording.
 */
import LegalPlaceholder from '@/app/components/LegalPlaceholder.vue';
import SellerIdentityBlock from '@/app/components/SellerIdentityBlock.vue';
import StaticPageLinks from '@/app/components/StaticPageLinks.vue';
</script>

<template>
    <div id="static-page-terms">
        <v-card class="mx-auto mt-10 w-full max-w-2xl p-8">
            <SellerIdentityBlock />

            <LegalPlaceholder page="terms" />

            <StaticPageLinks current="terms" />
        </v-card>
    </div>
</template>
