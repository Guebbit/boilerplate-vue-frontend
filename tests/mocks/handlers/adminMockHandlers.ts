/**
 * The three `/observability/*` endpoints behind `AdminOverviewTab.vue` and the audit tab.
 *
 * These payloads used to be three frozen module-level constants declared right here, returned
 * identically under every profile. That made the admin dashboard — the most numeric, most
 * layout-fragile screen in the app — the one screen `resilience.cy.ts` could never stress: it had
 * never rendered a 7-digit request count, a zero-request cold start, or a `loadAvg` array of an
 * unexpected length, because no profile could reach it.
 *
 * They now live in `mockDatabase.observability`, populated by whichever profile is active, and
 * this file does what every other handler family already does: read the database and wrap it. The
 * fixed values themselves are unchanged — they moved to `mockProfiles.ts` verbatim.
 */
import { http, type HttpHandler } from 'msw';
import {
    GetObservabilityHealthResponse,
    GetObservabilityMetricsOverviewResponse,
    GetObservabilityAuditLogsResponse
} from '@api/schemas';
import { createSuccessEnvelope, getIsoDateNow, mockDatabase } from '../shared/mockShared.ts';
import { toMockJsonResponse } from '../shared/mockTransport.ts';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const registerAdminMockHandlers = (): HttpHandler[] => [
    /*
     * `timestamp` is stamped at response time rather than served from the database on both health
     * and metrics: the dashboard renders it as "as of", and a value frozen at database-build time
     * would age visibly across a spec run. The random profile varies everything else.
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
