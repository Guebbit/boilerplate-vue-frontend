/**
 * @module
 * View-layer types for the observability domain: shapes the admin dashboard and the realtime
 * playground assemble that no single endpoint answers with, plus the feed entry and connection
 * lifecycle of the SSE stream.
 *
 * Contract types (ObservabilityHealth, ObservabilityMetricsSummary, AuditEventItem, etc.)
 * come from `@types`, which re-exports the generated `@api` client types.
 * Only UI/composition-specific types belong here.
 */
import type { ObservabilityMetricsPayload } from '@types';

/**
 * Identifies each tab in the Admin dashboard.
 */
export type AdminTabKey = 'overview' | 'audit';

/**
 * A single KPI card shown in the admin overview.
 */
export interface AdminKpiCard {
    /** Card label. */
    title: string;
    /** Formatted metric value, already display-ready. */
    value: string | number;
    /** Optional supporting text shown under the value. */
    hint?: string;
    /** Visual state driving the card's icon/colour; omitted means no status badge. */
    status?: 'ok' | 'warn' | 'error' | 'loading' | 'unknown';
}

/**
 * Audit filter form state.
 */
export interface AdminAuditFilters {
    /** Filter by the actor who performed the action. */
    actor?: string;
    /** Filter by the audited action name. */
    action?: string;
    /** Filter by whether the action succeeded or failed. */
    outcome?: 'success' | 'failure';
    /** ISO timestamp lower bound — only events at or after this time. */
    since?: string;
    /** Requested page number, 1-based. */
    page?: number;
    /** Rows per page. */
    pageSize?: number;
}

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
