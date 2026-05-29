import { http, type HttpHandler } from 'msw';
import type {
    AdminHealthResponse,
    AdminMetricsSummaryResponse,
    AuditLogsResponse
} from '@/types';
import { getIsoDateNow } from '../shared/mockShared.ts';
import { toMockJsonResponse } from '../shared/mockTransport.ts';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

const MOCK_HEALTH_RESPONSE: AdminHealthResponse = {
    success: true,
    data: {
        status: 'ok',
        environment: 'development',
        service: 'boilerplate-node-backend',
        nodeVersion: 'v20.0.0',
        uptimeSeconds: 3600,
        database: { status: 'connected' },
        integrations: { loki: false, posthog: false, otelEnabled: false },
        memory: { heapUsedMb: 64, heapTotalMb: 128, rssMb: 80 },
        system: { platform: 'linux', cpuCount: 4, loadAvg: [0.5, 0.4, 0.3] },
        timestamp: getIsoDateNow()
    }
};

const MOCK_METRICS_RESPONSE: AdminMetricsSummaryResponse = {
    success: true,
    data: {
        http: {
            totalRequests: 1042,
            totalErrors: 12,
            errorRate: 0.0115,
            inFlight: 2,
            latencyMs: { p50: 18, p95: 85 }
        },
        auth: { loginSuccess: 58, loginFailure: 4, signupSuccess: 12 },
        business: { checkoutSuccess: 22, ordersCreated: 22 },
        database: { queriesTotal: 3120, errorsTotal: 0 },
        process: { uptimeSeconds: 3600, heapUsedMb: 64 },
        timestamp: getIsoDateNow()
    }
};

const MOCK_AUDIT_EVENTS: AuditLogsResponse = {
    success: true,
    data: {
        total: 3,
        items: [
            {
                actor_user_id: 'user-admin-1',
                actor_role: 'admin',
                action: 'auth.login.succeeded',
                outcome: 'success',
                ip: '127.0.0.1',
                request_id: 'req-abc12345',
                trace_id: 'trace-def67890',
                timestamp: new Date(Date.now() - 60_000).toISOString(),
                level: 'info'
            },
            {
                actor_user_id: 'user-guest-1',
                actor_role: 'anonymous',
                action: 'auth.login.failed',
                outcome: 'failure',
                ip: '192.168.1.50',
                request_id: 'req-xyz99887',
                trace_id: 'trace-uvw33221',
                timestamp: new Date(Date.now() - 120_000).toISOString(),
                level: 'warn'
            },
            {
                actor_user_id: 'user-standard-2',
                actor_role: 'user',
                action: 'orders.create',
                outcome: 'success',
                ip: '10.0.0.5',
                request_id: 'req-lmn55443',
                trace_id: 'trace-opq11009',
                timestamp: new Date(Date.now() - 300_000).toISOString(),
                level: 'info'
            }
        ]
    }
};

export const registerAdminMockHandlers = (): HttpHandler[] => [
    http.get(`${API_BASE}/admin/health`, () =>
        toMockJsonResponse({
            ...MOCK_HEALTH_RESPONSE,
            data: { ...MOCK_HEALTH_RESPONSE.data, timestamp: getIsoDateNow() }
        })
    ),
    http.get(`${API_BASE}/admin/metrics/summary`, () =>
        toMockJsonResponse({
            ...MOCK_METRICS_RESPONSE,
            data: { ...MOCK_METRICS_RESPONSE.data, timestamp: getIsoDateNow() }
        })
    ),
    http.get(`${API_BASE}/admin/audit`, () => toMockJsonResponse(MOCK_AUDIT_EVENTS))
];
