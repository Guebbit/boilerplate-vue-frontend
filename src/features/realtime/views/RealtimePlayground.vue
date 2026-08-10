<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import FeedbackMessageFeed from '@/components/organisms/FeedbackMessageFeed.vue';
import { useRealtimeObservability } from '@/features/realtime/useRealtimeObservability';
import type { IRealtimeMetricsEntry } from '@types';

const { t } = useI18n();

const {
    status: observabilityStatus,
    entries: observabilityEntries,
    connect: connectObservability,
    disconnect: disconnectObservability
} = useRealtimeObservability();

/**
 * Rounds a byte count to whole megabytes for compact display.
 *
 * @param bytes - Raw byte count.
 * @returns The size in whole megabytes, e.g. `42MB`.
 */
const formatMb = (bytes: number) => `${Math.round(bytes / 1024 / 1024)}MB`;

/**
 * Renders one metrics SSE event as a single feed line.
 *
 * @param entry - Feed entry holding the event kind, timestamp and payload.
 * @returns A one-line summary prefixed with the kind, so snapshot / update /
 *  heartbeat entries stay distinguishable from each other.
 */
const formatMetricsEntry = (entry: IRealtimeMetricsEntry) => {
    const time = new Date(entry.timestamp).toLocaleTimeString();
    const { uptimeSeconds, memory, http, realtime } = entry.payload;

    return (
        `[${entry.kind}] ${time} · up ${Math.round(uptimeSeconds)}s · ` +
        `heap ${formatMb(memory.heapUsed)}/${formatMb(memory.heapTotal)} · ` +
        `req ${http.totalRequests} (${http.totalErrors} err) · ` +
        `sse ${realtime.sseClients}`
    );
};
</script>

<template>
    <LayoutDefault id="realtime-playground-page" :title="t('realtime-playground-page.page-title')">
        <section class="grid gap-6">
            <v-card class="flex flex-col gap-4 p-6">
                <div>
                    <h3 class="text-lg font-semibold">
                        {{ t('realtime-playground-page.sse-observability') }}
                    </h3>
                    <v-chip size="small" variant="tonal" color="secondary" class="mt-1">
                        {{ observabilityStatus }}
                    </v-chip>
                </div>
                <div class="flex flex-wrap gap-2">
                    <v-btn color="primary" variant="tonal" @click="connectObservability">
                        {{ t('realtime-playground-page.button-connect') }}
                    </v-btn>
                    <v-btn variant="tonal" @click="disconnectObservability">
                        {{ t('realtime-playground-page.button-disconnect') }}
                    </v-btn>
                </div>
                <FeedbackMessageFeed
                    :messages="observabilityEntries.map(formatMetricsEntry)"
                    variant="alert"
                    max-height="220px"
                    :empty-text="t('realtime-playground-page.empty-metrics')"
                />
            </v-card>
        </section>
    </LayoutDefault>
</template>
