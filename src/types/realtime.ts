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

export type RealtimeConnectionStatus =
    | 'idle'
    | 'connecting'
    | 'open'
    | 'closed'
    | 'error';
