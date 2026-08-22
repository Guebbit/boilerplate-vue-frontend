<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Camera, RefreshCw, HeartPulse } from 'lucide-vue-next';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import CardMaterialStat from '@/ui/organisms/CardMaterialStat.vue';
import { useRealtimeObservability } from '@/modules/realtime/use-realtime-observability';
import { formatMegabytes, formatTime, formatUptime } from '@/infrastructure/utils/formatters.ts';
import type { RealtimeMetricsEntry } from '@types';

const { t } = useI18n();

const {
    status: observabilityStatus,
    entries: observabilityEntries,
    connect: connectObservability,
    disconnect: disconnectObservability
} = useRealtimeObservability();

/** When on, each feed entry shows its full raw JSON payload instead of the metric grid. */
const showRawEvents = ref(false);

/** Icon, chip color and left-border accent for each SSE event kind. */
const KIND_META: Record<
    RealtimeMetricsEntry['kind'],
    { icon: typeof Camera; color: string; border: string }
> = {
    snapshot: { icon: Camera, color: 'info', border: 'border-s-info' },
    update: { icon: RefreshCw, color: 'primary', border: 'border-s-primary' },
    heartbeat: { icon: HeartPulse, color: 'secondary', border: 'border-s-secondary' }
};

/** The most recently received event, driving the KPI tiles above the feed. */
const latestEntry = computed(() => observabilityEntries.value.at(-1));

/** The feed, newest event first — a live stream reads better without manual scrolling. */
const feedEntries = computed(() => observabilityEntries.value.toReversed());
</script>

<template>
    <LayoutDefault id="realtime-playground-page" :title="t('realtime-playground-page.page-title')">
        <section class="grid gap-6">
            <v-card class="flex flex-col gap-4 p-6">
                <div>
                    <h2 class="text-lg font-semibold">
                        {{ t('realtime-playground-page.sse-observability') }}
                    </h2>
                    <!-- A status, named as one: the bare word "open" means nothing out of context. -->
                    <v-chip
                        size="small"
                        variant="tonal"
                        color="secondary"
                        class="mt-1"
                        role="status"
                        :aria-label="
                            t('realtime-playground-page.connection-status', {
                                status: observabilityStatus
                            })
                        "
                    >
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

                <div v-if="latestEntry" class="grid gap-3">
                    <h3 class="text-sm font-semibold">
                        {{ t('realtime-playground-page.section-current') }}
                    </h3>
                    <div class="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4">
                        <CardMaterialStat
                            :title="t('realtime-playground-page.stat-uptime')"
                            :value="formatUptime(latestEntry.payload.uptimeSeconds)"
                            accent="primary"
                        />
                        <CardMaterialStat
                            :title="t('realtime-playground-page.stat-heap')"
                            :value="`${formatMegabytes(latestEntry.payload.memory.heapUsed)} / ${formatMegabytes(latestEntry.payload.memory.heapTotal)}`"
                            accent="secondary"
                        />
                        <CardMaterialStat
                            :title="t('realtime-playground-page.stat-requests')"
                            :value="latestEntry.payload.http.totalRequests"
                            :subtitle="`${latestEntry.payload.http.totalErrors} ${t('realtime-playground-page.stat-errors-suffix')}`"
                            accent="tertiary"
                        />
                        <CardMaterialStat
                            :title="t('realtime-playground-page.stat-sse-clients')"
                            :value="latestEntry.payload.realtime.sseClients"
                            accent="primary"
                        />
                    </div>
                </div>

                <div class="grid gap-3">
                    <h3 class="text-sm font-semibold">
                        {{ t('realtime-playground-page.section-feed') }}
                    </h3>
                    <!--
                        One line is live, not the feed: a live region over a list of cards reads
                        every card again on every event. The feed itself is a log a reader can
                        scroll into — focusable, since a scroll box without focus is keyboard-dead.
                    -->
                    <p class="m-0 text-xs opacity-70" role="status" aria-live="polite">
                        {{
                            latestEntry
                                ? t('realtime-playground-page.feed-summary', {
                                      count: feedEntries.length,
                                      kind: latestEntry.kind,
                                      time: formatTime(latestEntry.timestamp)
                                  })
                                : t('realtime-playground-page.empty-metrics')
                        }}
                    </p>
                    <div
                        class="max-h-[320px] overflow-y-auto"
                        tabindex="0"
                        role="log"
                        :aria-label="t('realtime-playground-page.section-feed')"
                    >
                        <template v-if="feedEntries.length > 0">
                            <v-card
                                v-for="entry in feedEntries"
                                :key="entry.id"
                                variant="flat"
                                border
                                class="mb-2 border-s-4 px-4 py-3 last:mb-0"
                                :class="KIND_META[entry.kind].border"
                            >
                                <div class="flex flex-wrap items-center gap-2">
                                    <v-chip
                                        size="small"
                                        variant="tonal"
                                        :color="KIND_META[entry.kind].color"
                                    >
                                        <component
                                            :is="KIND_META[entry.kind].icon"
                                            :size="14"
                                            class="mr-1"
                                            aria-hidden="true"
                                        />
                                        {{ entry.kind }}
                                    </v-chip>
                                    <span class="text-xs opacity-70">
                                        {{ formatTime(entry.timestamp) }}
                                    </span>
                                </div>

                                <pre
                                    v-if="showRawEvents"
                                    class="mt-2 overflow-x-auto font-mono text-xs"
                                    >{{ JSON.stringify(entry.payload, null, 2) }}</pre>
                                <dl
                                    v-else
                                    class="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs sm:grid-cols-4"
                                >
                                    <div class="flex justify-between gap-2">
                                        <dt class="opacity-60">
                                            {{ t('realtime-playground-page.stat-uptime') }}
                                        </dt>
                                        <dd>{{ formatUptime(entry.payload.uptimeSeconds) }}</dd>
                                    </div>
                                    <div class="flex justify-between gap-2">
                                        <dt class="opacity-60">
                                            {{ t('realtime-playground-page.stat-heap') }}
                                        </dt>
                                        <dd>
                                            {{ formatMegabytes(entry.payload.memory.heapUsed) }} /
                                            {{ formatMegabytes(entry.payload.memory.heapTotal) }}
                                        </dd>
                                    </div>
                                    <div class="flex justify-between gap-2">
                                        <dt class="opacity-60">
                                            {{ t('realtime-playground-page.stat-requests') }}
                                        </dt>
                                        <dd>
                                            {{ entry.payload.http.totalRequests }} ({{
                                                entry.payload.http.totalErrors
                                            }}
                                            {{ t('realtime-playground-page.stat-errors-suffix') }})
                                        </dd>
                                    </div>
                                    <div class="flex justify-between gap-2">
                                        <dt class="opacity-60">
                                            {{ t('realtime-playground-page.stat-sse-clients') }}
                                        </dt>
                                        <dd>{{ entry.payload.realtime.sseClients }}</dd>
                                    </div>
                                </dl>
                            </v-card>
                        </template>
                        <p v-else class="m-0 p-4 text-center opacity-75">
                            {{ t('realtime-playground-page.empty-metrics') }}
                        </p>
                    </div>
                </div>
            </v-card>
        </section>
    </LayoutDefault>
</template>
