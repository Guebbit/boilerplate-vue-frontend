import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useRealtimeObservabilityStore } from '@/stores/realtimeObservability';
import type { IMetricsSnapshotEvent } from '@types';

// Minimal valid metrics payload used across tests
const makeSnapshot = (timestamp: string): IMetricsSnapshotEvent => ({
    timestamp,
    uptimeSeconds: 60,
    memory: { rss: 1, heapUsed: 1, heapTotal: 2, external: 0 },
    http: { totalRequests: 10, totalErrors: 0 },
    realtime: { websocketConnections: 2, sseClients: 1 }
});

describe('useRealtimeObservabilityStore', () => {
    beforeEach(() => {
        // Fresh Pinia instance before every test so stores don't bleed state
        setActivePinia(createPinia());
    });

    it('initialises with idle status and no data', () => {
        const store = useRealtimeObservabilityStore();

        expect(store.status).toBe('idle');
        expect(store.latestSnapshot).toBeUndefined();
        expect(store.latestUpdate).toBeUndefined();
        expect(store.latestHeartbeatAt).toBeUndefined();
        expect(store.lastError).toBeUndefined();
    });

    it('updates status via setStatus', () => {
        const store = useRealtimeObservabilityStore();

        store.setStatus('connecting');
        expect(store.status).toBe('connecting');

        store.setStatus('open');
        expect(store.status).toBe('open');
    });

    it('stores a metrics snapshot via setSnapshot', () => {
        const store = useRealtimeObservabilityStore();
        const snapshot = makeSnapshot('2026-01-01T00:00:00.000Z');

        store.setSnapshot(snapshot);

        expect(store.latestSnapshot).toEqual(snapshot);
    });

    it('stores a metrics update via setUpdate', () => {
        const store = useRealtimeObservabilityStore();
        const update = makeSnapshot('2026-01-01T00:01:00.000Z');

        store.setUpdate(update);

        expect(store.latestUpdate).toEqual(update);
    });

    it('records only the timestamp from a heartbeat payload via setHeartbeat', () => {
        const store = useRealtimeObservabilityStore();
        const heartbeat = makeSnapshot('2026-01-01T00:02:00.000Z');

        store.setHeartbeat(heartbeat);

        expect(store.latestHeartbeatAt).toBe('2026-01-01T00:02:00.000Z');
        // snapshot and update remain untouched
        expect(store.latestSnapshot).toBeUndefined();
        expect(store.latestUpdate).toBeUndefined();
    });

    it('stores the latest error message via setError', () => {
        const store = useRealtimeObservabilityStore();

        store.setError('connection lost');

        expect(store.lastError).toBe('connection lost');
    });

    it('overwrites previous values when actions are called again', () => {
        const store = useRealtimeObservabilityStore();

        store.setSnapshot(makeSnapshot('2026-01-01T00:00:00.000Z'));
        store.setSnapshot(makeSnapshot('2026-01-02T00:00:00.000Z'));

        expect(store.latestSnapshot?.timestamp).toBe('2026-01-02T00:00:00.000Z');
    });
});
