<script setup lang="ts">
/**
 * @module
 * The "?" button a page with a guided tour wears. It owns no tour logic: it sets `?tour=<id>` on
 * the current route, the same door the account menu and a docs link use, and the app shell's
 * `AppTourHost` does the rest. Hidden when the deployment turned tours off.
 */
import { CircleHelp } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { readToursEnabled } from '@/infrastructure/runtime-config.ts';

/**
 * Component props.
 */
const props = defineProps<{
    /**
     * Catalogue id of the tour this page offers.
     */
    tour: string;
}>();

/**
 * Router and route, to add `?tour=` to the current address.
 */
const router = useRouter();

/**
 * The route whose other query values must survive.
 */
const route = useRoute();

/**
 * Translation function for the button's label.
 */
const { t } = useI18n();

/**
 * Whether tours are on in this deployment.
 */
const enabled = readToursEnabled();

/**
 * Asks the shell to open the tour.
 */
const open = () => void router.push({ query: { ...route.query, tour: props.tour } });
</script>

<template>
    <v-btn
        v-if="enabled"
        variant="text"
        size="small"
        :data-test="`tour-${tour}`"
        :aria-label="t('tours.button-label')"
        @click="open"
    >
        <CircleHelp :size="18" class="mr-1" aria-hidden="true" />
        {{ t('tours.button-text') }}
    </v-btn>
</template>
