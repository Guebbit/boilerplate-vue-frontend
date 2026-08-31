<script setup lang="ts">
/**
 * @module
 * Thin presentational banner: probes the API's liveness endpoint and wires the reachability flag
 * to a persistent `aria-live` region so the message is announced only when it actually changes.
 */
import { useI18n } from 'vue-i18n';
import { CloudOff } from 'lucide-vue-next';
import { useLivenessProbe } from '@guebbit/vue-toolkit';
// Deliberate exception to "a component wires, it does not call the API": this is the one and
// only caller of GET / in the whole app, and splitting it into its own composable/store just to
// satisfy the rule would trade one banned import for a whole extra file wrapping a single line.
// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- see above
import { getHealth } from '@api';

/**
 * A thin banner that appears when the API cannot be reached, and only then.
 *
 * Deliberately not an error page: the app renders plenty without a backend (bundled dictionaries,
 * cached pages), so the honest message is "degraded", not "broken".
 */
const { t } = useI18n();
const { down } = useLivenessProbe(() => getHealth());
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
