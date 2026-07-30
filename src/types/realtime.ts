import type { IObservabilityMetricsPayload } from './realtime.generated';

/**
 * A single observability SSE event rendered as a feed entry.
 * `kind` maps to the three named metrics events so they can be styled/labelled distinctly.
 */
export interface IRealtimeMetricsEntry {
    id: string;
    kind: 'snapshot' | 'update' | 'heartbeat';
    timestamp: string;
    payload: IObservabilityMetricsPayload;
}

export type IRealtimeConnectionStatus =
    | 'idle'
    | 'connecting'
    | 'open'
    | 'closed'
    | 'error';
