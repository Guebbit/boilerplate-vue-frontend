/**
 * Admin dashboard data models.
 *
 * These types describe the shape of observability / analytics data that the
 * admin dashboard visualises.  Most fields are optional because the backend
 * endpoints may not yet exist — the UI degrades gracefully to empty states.
 */

// ── KPI summary ──────────────────────────────────────────────────────────────

/** A single headline metric shown in the KPI card row. */
export interface IAdminKpi {
    /** Short human-readable label, e.g. "Total users". */
    label: string;
    /** The metric value to display prominently. */
    value: string | number;
    /** Optional supporting detail shown below the value. */
    subtitle?: string;
    /** Accent colour token; maps to MaterialStatCard accent prop. */
    accent?: 'primary' | 'secondary' | 'tertiary';
}

// ── Log entries ───────────────────────────────────────────────────────────────

/** Severity levels mirroring standard structured-log conventions. */
export type AdminLogLevel = 'error' | 'warn' | 'info' | 'debug';

/** A single structured log entry surfaced in the Logs tab. */
export interface IAdminLogEntry {
    /** ISO-8601 timestamp. */
    timestamp: string;
    level: AdminLogLevel;
    /** Primary log message. */
    message: string;
    /** Optional correlation id linking to a request / trace. */
    requestId?: string;
    /** Optional OpenTelemetry trace id. */
    traceId?: string;
    /** Route or module that emitted the log. */
    source?: string;
}

// ── Audit events ──────────────────────────────────────────────────────────────

/** Outcome of an audited action. */
export type AdminAuditOutcome = 'success' | 'failure' | 'denied';

/** A security / audit event entry surfaced in the Audit tab. */
export interface IAdminAuditEvent {
    /** ISO-8601 timestamp. */
    timestamp: string;
    /** ID of the user who performed the action, if known. */
    actorUserId?: string;
    /** Role of the actor, e.g. "admin" or "user". */
    actorRole?: string;
    /** The action taken, e.g. "user.delete" or "product.update". */
    action: string;
    /** Type of the affected resource, e.g. "User" or "Product". */
    targetType?: string;
    /** ID of the affected resource. */
    targetId?: string;
    outcome: AdminAuditOutcome;
    /** Correlation id linking to the originating request. */
    requestId?: string;
    traceId?: string;
}

// ── Traces ────────────────────────────────────────────────────────────────────

/** A summarised distributed trace surfaced in the Traces tab. */
export interface IAdminTrace {
    traceId: string;
    /** Root span name, e.g. "GET /products". */
    rootSpan: string;
    /** Total end-to-end duration in milliseconds. */
    durationMs: number;
    /** ISO-8601 start timestamp. */
    startTime: string;
    /** HTTP status code of the root request, if applicable. */
    statusCode?: number;
    /** Whether the trace contains at least one error span. */
    hasError?: boolean;
}

// ── Analytics ─────────────────────────────────────────────────────────────────

/** A single data point in a time-series chart. */
export interface IAdminTimeSeriesPoint {
    /** ISO-8601 or human-readable label, e.g. "2024-05-01". */
    label: string;
    value: number;
}

/** A named time-series metric surfaced in the Analytics tab. */
export interface IAdminTimeSeries {
    name: string;
    unit?: string;
    points: IAdminTimeSeriesPoint[];
}

// ── Dashboard summary ─────────────────────────────────────────────────────────

/**
 * Top-level shape of the data returned by a hypothetical
 * GET /admin/summary endpoint.  All sections are optional so the
 * dashboard can render as data arrives.
 */
export interface IAdminDashboardSummary {
    kpis?: IAdminKpi[];
    recentLogs?: IAdminLogEntry[];
    recentAuditEvents?: IAdminAuditEvent[];
    recentTraces?: IAdminTrace[];
    timeSeries?: IAdminTimeSeries[];
}

/** Tab identifiers for the admin dashboard section switcher. */
export type AdminDashboardTab = 'overview' | 'logs' | 'audit' | 'traces' | 'analytics';
