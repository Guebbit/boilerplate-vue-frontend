/**
 * The three `/observability/*` endpoints behind `AdminOverviewTab.vue` and the audit tab.
 *
 * The payloads live in `mockDatabase.observability`, populated by whichever profile is active,
 * so this file does what every other handler family does: read the database and wrap it. Serving
 * them from frozen constants here instead would leave the admin dashboard — the most numeric,
 * most layout-fragile screen in the app — the one screen `resilience.cy.ts` cannot stress with a
 * 7-digit request count, a zero-request cold start, or an odd-length `loadAvg`.
 */
import { http, type HttpHandler } from 'msw';
import {
    GetObservabilityHealthResponse,
    GetObservabilityMetricsOverviewResponse,
    GetObservabilityAuditLogsResponse
} from '@api/schemas';
import { createSuccessEnvelope, getIsoDateNow, mockDatabase } from '@mocks/mockDb.ts';
import { toMockJsonResponse } from '@mocks/mockTransport.ts';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const registerAdminMockHandlers = (): HttpHandler[] => [
    /*
     * `timestamp` is stamped at response time rather than served from the database on both health
     * and metrics: the dashboard renders it as "as of", and a value frozen at database-build time
     * would age visibly across a spec run.
     */
    http.get(`${API_BASE}/observability/health`, () =>
        toMockJsonResponse(
            createSuccessEnvelope({
                success: true,
                data: { ...mockDatabase.observability.health, timestamp: getIsoDateNow() }
            }),
            { schema: GetObservabilityHealthResponse }
        )
    ),
    http.get(`${API_BASE}/observability/metrics/overview`, () =>
        toMockJsonResponse(
            createSuccessEnvelope({
                success: true,
                data: { ...mockDatabase.observability.metrics, timestamp: getIsoDateNow() }
            }),
            { schema: GetObservabilityMetricsOverviewResponse }
        )
    ),
    http.get(`${API_BASE}/observability/audit`, () =>
        toMockJsonResponse(
            createSuccessEnvelope({ success: true, data: mockDatabase.observability.audit }),
            { schema: GetObservabilityAuditLogsResponse }
        )
    )
];
