import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { IRealtimeConnectionStatus, IMetricsSnapshotEvent } from '@types';

export const useRealtimeObservabilityStore = defineStore('realtime-observability', () => {
    const status = ref<IRealtimeConnectionStatus>('idle');
    const latestSnapshot = ref<IMetricsSnapshotEvent | undefined>(undefined);
    const latestUpdate = ref<IMetricsSnapshotEvent | undefined>(undefined);
    const latestHeartbeatAt = ref<string | undefined>(undefined);
    const lastError = ref<string | undefined>(undefined);

    const setStatus = (nextStatus: IRealtimeConnectionStatus) => {
        status.value = nextStatus;
    };

    const setSnapshot = (snapshot: IMetricsSnapshotEvent) => {
        latestSnapshot.value = snapshot;
    };

    const setUpdate = (update: IMetricsSnapshotEvent) => {
        latestUpdate.value = update;
    };

    const setHeartbeat = (heartbeat: IMetricsSnapshotEvent) => {
        latestHeartbeatAt.value = heartbeat.timestamp;
    };

    const setError = (error: string) => {
        lastError.value = error;
    };

    return {
        status,
        latestSnapshot,
        latestUpdate,
        latestHeartbeatAt,
        lastError,
        setStatus,
        setSnapshot,
        setUpdate,
        setHeartbeat,
        setError
    };
});
