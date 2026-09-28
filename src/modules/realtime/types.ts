/**
 * @module
 * View-only types for the realtime module — the shape of one rendered SSE feed entry and the
 * connection's own lifecycle, not part of the API contract (`@types`) or the store's own state.
 */
import type { ObservabilityMetricsPayload } from '@types';

/**
 * A single observability SSE event rendered as a feed entry.
 * `kind` maps to the three named metrics events so they can be styled/labelled distinctly.
 */
export interface RealtimeMetricsEntry {
    /**
     * Unique id for this feed entry, used as the render key.
     */
    id: string;
    /**
     * Which of the three named metrics events this entry represents.
     */
    kind: 'snapshot' | 'update' | 'heartbeat';
    /**
     * ISO timestamp of when the entry was received.
     */
    timestamp: string;
    /**
     * The metrics payload carried by the event.
     */
    payload: ObservabilityMetricsPayload;
}

/**
 * Lifecycle state of a realtime connection (SSE), from not-yet-started through open to closed
 * or errored.
 */
export type RealtimeConnectionStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error';
