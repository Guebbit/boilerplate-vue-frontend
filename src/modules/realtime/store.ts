/**
 * @module
 * Pinia store holding the live SSE state for the observability dashboard: connection status,
 * the two latest payload shapes kept separately, and a capped feed. Pure state plus setters — the
 * connection itself lives in `use-realtime-observability.ts`, which calls these actions.
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { RealtimeConnectionStatus, MetricsSnapshotEvent, RealtimeMetricsEntry } from '@types';

/**
 * Holds the live state of the observability metrics stream (SSE): connection
 * status, latest payloads and a capped event feed.
 */
export const useRealtimeObservabilityStore = defineStore('realtime-observability', () => {
    /**
     * Lifecycle of the SSE connection: idle until `connect` is called, then connecting/open/etc.
     */
    const status = ref<RealtimeConnectionStatus>('idle');

    /**
     * The full metrics snapshot sent when the stream opens; absent until then.
     */
    const latestSnapshot = ref<MetricsSnapshotEvent | undefined>(undefined);

    /**
     * The most recent incremental metrics update; absent until one arrives.
     */
    const latestUpdate = ref<MetricsSnapshotEvent | undefined>(undefined);

    /**
     * Timestamp of the latest heartbeat, so a quiet-but-open stream can be told from a stalled one.
     */
    const latestHeartbeatAt = ref<string | undefined>(undefined);

    /**
     * The event feed, newest entries capped to the last 100 — see `addEntry`.
     */
    const entries = ref<RealtimeMetricsEntry[]>([]);

    /**
     * The last stream error message, for display in the UI; absent when nothing has failed.
     */
    const lastError = ref<string | undefined>(undefined);

    /**
     * Updates the connection status of the metrics stream.
     *
     * @param nextStatus - New status, e.g. `idle`, `open`, `closed`.
     */
    const setStatus = (nextStatus: RealtimeConnectionStatus) => {
        status.value = nextStatus;
    };

    /**
     * Stores the full metrics snapshot sent when the stream opens.
     *
     * @param snapshot - Snapshot event received from the server.
     */
    const setSnapshot = (snapshot: MetricsSnapshotEvent) => {
        latestSnapshot.value = snapshot;
    };

    /**
     * Stores the most recent incremental metrics update.
     *
     * @param update - Update event received from the server.
     */
    const setUpdate = (update: MetricsSnapshotEvent) => {
        latestUpdate.value = update;
    };

    /**
     * Records the timestamp of the latest heartbeat, used to tell "connected but
     * quiet" apart from "stalled".
     *
     * @param heartbeat - Heartbeat event; only its `timestamp` is kept.
     */
    const setHeartbeat = (heartbeat: MetricsSnapshotEvent) => {
        latestHeartbeatAt.value = heartbeat.timestamp;
    };

    /**
     * Appends a metrics event to the feed, capping history at the last 100
     * entries so a long-lived stream cannot grow unbounded.
     *
     * @param entry - Feed entry to append.
     */
    const addEntry = (entry: RealtimeMetricsEntry) => {
        entries.value = [...entries.value, entry].slice(-100);
    };

    /**
     * Records the last stream error, for display in the UI.
     *
     * @param error - Human-readable error message.
     */
    const setError = (error: string) => {
        lastError.value = error;
    };

    return {
        status,
        latestSnapshot,
        latestUpdate,
        latestHeartbeatAt,
        entries,
        lastError,
        setStatus,
        setSnapshot,
        setUpdate,
        setHeartbeat,
        addEntry,
        setError
    };
});
