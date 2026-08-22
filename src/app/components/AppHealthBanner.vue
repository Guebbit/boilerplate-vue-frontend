<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { CloudOff } from 'lucide-vue-next';
import { useApiHealth } from '@/infrastructure/composables/use-api-health.ts';

/**
 * A thin banner that appears when the API cannot be reached, and only then.
 *
 * Deliberately not an error page: the app renders plenty without a backend (bundled dictionaries,
 * cached pages), so the honest message is "degraded", not "broken". The probing itself is
 * {@link useApiHealth}'s — a component wires, it does not call the API.
 */
const { t } = useI18n();
const { down } = useApiHealth();
</script>

<template>
    <!--
        The live region stays mounted at all times and only its CONTENT comes and goes. A region
        that is created together with its message is never announced — assistive technology only
        reports changes inside a region it already knew about.
    -->
    <div role="status" aria-live="polite" aria-atomic="true">
        <v-system-bar
            v-if="down"
            color="warning"
            class="justify-center gap-2"
            data-test="health-banner"
        >
            <CloudOff :size="14" aria-hidden="true" />
            <span>{{ t('generic.api-unreachable') }}</span>
        </v-system-bar>
    </div>
</template>
