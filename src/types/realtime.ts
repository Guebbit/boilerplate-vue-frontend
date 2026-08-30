/**
 * @module
 * Types for the realtime observability feed: the shape of one rendered SSE entry, and the
 * possible lifecycle states of the connection feeding it.
 */

import type { ObservabilityMetricsPayload } from './asyncapi.generated';

/**
 * A single observability SSE event rendered as a feed entry.
 * `kind` maps to the three named metrics events so they can be styled/labelled distinctly.
 */
export interface RealtimeMetricsEntry {
    id: string;
    kind: 'snapshot' | 'update' | 'heartbeat';
    timestamp: string;
    payload: ObservabilityMetricsPayload;
}

/**
 * Lifecycle state of a realtime connection (SSE), from not-yet-started through open to closed
 * or errored.
 */
export type RealtimeConnectionStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error';
