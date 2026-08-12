import { defineStore } from 'pinia';
import { ref } from 'vue';
import type {
    IRealtimeConnectionStatus,
    IMetricsSnapshotEvent,
    IRealtimeMetricsEntry
} from '@types';

/**
 * Holds the live state of the observability metrics stream (SSE): connection
 * status, latest payloads and a capped event feed.
 */
export const useRealtimeObservabilityStore = defineStore('realtime-observability', () => {
    const status = ref<IRealtimeConnectionStatus>('idle');
    const latestSnapshot = ref<IMetricsSnapshotEvent | undefined>(undefined);
    const latestUpdate = ref<IMetricsSnapshotEvent | undefined>(undefined);
    const latestHeartbeatAt = ref<string | undefined>(undefined);
    const entries = ref<IRealtimeMetricsEntry[]>([]);
    const lastError = ref<string | undefined>(undefined);

    /**
     * Updates the connection status of the metrics stream.
     *
     * @param nextStatus - New status, e.g. `idle`, `open`, `closed`.
     */
    const setStatus = (nextStatus: IRealtimeConnectionStatus) => {
        status.value = nextStatus;
    };

    /**
     * Stores the full metrics snapshot sent when the stream opens.
     *
     * @param snapshot - Snapshot event received from the server.
     */
    const setSnapshot = (snapshot: IMetricsSnapshotEvent) => {
        latestSnapshot.value = snapshot;
    };

    /**
     * Stores the most recent incremental metrics update.
     *
     * @param update - Update event received from the server.
     */
    const setUpdate = (update: IMetricsSnapshotEvent) => {
        latestUpdate.value = update;
    };

    /**
     * Records the timestamp of the latest heartbeat, used to tell "connected but
     * quiet" apart from "stalled".
     *
     * @param heartbeat - Heartbeat event; only its `timestamp` is kept.
     */
    const setHeartbeat = (heartbeat: IMetricsSnapshotEvent) => {
        latestHeartbeatAt.value = heartbeat.timestamp;
    };

    /**
     * Appends a metrics event to the feed, capping history at the last 100
     * entries so a long-lived stream cannot grow unbounded.
     *
     * @param entry - Feed entry to append.
     */
    const addEntry = (entry: IRealtimeMetricsEntry) => {
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
