<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import FeedbackMessageFeed from '@/modules/realtime/components/FeedbackMessageFeed.vue';
import { useRealtimeObservability } from '@/modules/realtime/useRealtimeObservability';
import type { RealtimeMetricsEntry } from '@types';

const { t } = useI18n();

const {
    status: observabilityStatus,
    entries: observabilityEntries,
    connect: connectObservability,
    disconnect: disconnectObservability
} = useRealtimeObservability();

/** When on, the feed shows the full raw SSE frame instead of the one-line summary. */
const showRawEvents = ref(false);

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
const formatMetricsEntry = (entry: RealtimeMetricsEntry) => {
    const time = new Date(entry.timestamp).toLocaleTimeString();
    const { uptimeSeconds, memory, http, realtime } = entry.payload;

    return (
        `[${entry.kind}] ${time} · up ${Math.round(uptimeSeconds)}s · ` +
        `heap ${formatMb(memory.heapUsed)}/${formatMb(memory.heapTotal)} · ` +
        `req ${http.totalRequests} (${http.totalErrors} err) · ` +
        `sse ${realtime.sseClients}`
    );
};

/**
 * Renders one SSE event as its full raw frame: event name, arrival time and the
 * complete JSON payload exactly as received, for observability of the wire format.
 *
 * @param entry - Feed entry holding the event kind, timestamp and payload.
 * @returns A single-line `[kind] time {...payload}` string.
 */
const formatRawEntry = (entry: RealtimeMetricsEntry) => {
    const time = new Date(entry.timestamp).toLocaleTimeString();

    return `[${entry.kind}] ${time} ${JSON.stringify(entry.payload)}`;
};

/** Feed lines, switching between the summarised and raw rendering per `showRawEvents`. */
const feedMessages = computed(() =>
    observabilityEntries.value.map((entry) =>
        showRawEvents.value ? formatRawEntry(entry) : formatMetricsEntry(entry)
    )
);
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
                <div class="flex flex-wrap items-center gap-2">
                    <v-btn color="primary" variant="tonal" @click="connectObservability">
                        {{ t('realtime-playground-page.button-connect') }}
                    </v-btn>
                    <v-btn variant="tonal" @click="disconnectObservability">
                        {{ t('realtime-playground-page.button-disconnect') }}
                    </v-btn>
                    <v-switch
                        v-model="showRawEvents"
                        density="compact"
                        hide-details
                        class="flex-none"
                        :label="t('realtime-playground-page.label-raw-events')"
                    />
                </div>
                <FeedbackMessageFeed
                    :messages="feedMessages"
                    variant="alert"
                    max-height="220px"
                    :empty-text="t('realtime-playground-page.empty-metrics')"
                />
            </v-card>
        </section>
    </LayoutDefault>
</template>
