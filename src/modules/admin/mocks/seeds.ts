/**
 * The admin dashboard's slice of the mock database — what the three `/observability/*` endpoints
 * answer with.
 *
 * This lives in the database rather than as frozen constants in the handlers so the random profile
 * can reach it: `AdminOverviewTab.vue` is the most numeric and most layout-fragile screen in the
 * app, and `resilience.cy.ts` can only stress it with a 7-digit request count, a zero-request cold
 * start or a `loadAvg` of unexpected length if a profile can supply them.
 *
 * Owned by `admin` rather than by the mock layer because `src/modules/admin/mocks/handlers.ts` is
 * the only reader — see `src/modules/products/mocks/seeds.ts` for the general rule.
 */
import type { AuditLogsPage, ObservabilityHealth, ObservabilityMetricsSummary } from '@types';
import type { IMockSeedContext, IMockSeedData } from '@/kernel/registry';

/**
 * Stored as the INNER payloads (`ObservabilityHealthResponse['data']` and friends), not the
 * envelopes: the handlers build the envelope, exactly as they do for every other family.
 */
export interface IMockObservability {
    health: ObservabilityHealth;
    metrics: ObservabilityMetricsSummary;
    audit: AuditLogsPage;
}

declare module '@/kernel/registry' {
    interface IMockSeedData {
        observability: IMockObservability;
    }
}

const getIsoDateNow = () => new Date().toISOString();

/* The fixed observability payloads the three `/observability/*` handlers serve under the seed profile. */
const createSeedObservability = (): IMockObservability => ({
    health: {
        status: 'ok',
        environment: 'development',
        service: 'boilerplate-node-backend',
        nodeVersion: 'v20.0.0',
        uptimeSeconds: 3600,
        database: { status: 'connected' },
        integrations: { loki: true, otelEnabled: true, umami: true, faro: true },
        memory: { heapUsedMb: 64, heapTotalMb: 128, rssMb: 80 },
        system: { platform: 'linux', cpuCount: 4, loadAvg: [0.5, 0.4, 0.3] },
        timestamp: getIsoDateNow()
    },
    metrics: {
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
    },
    audit: {
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
});

/** Operational telemetry derives from no domain's data, so this builder ignores `soFar`. */
export const buildAdminMockSeeds = async ({
    profile
}: IMockSeedContext): Promise<Partial<IMockSeedData>> =>
    profile === 'random'
        ? import('./seedsRandom.ts').then((random) => ({
              observability: random.buildRandomObservability()
          }))
        : { observability: createSeedObservability() };
