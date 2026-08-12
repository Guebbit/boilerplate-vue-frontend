/**
 * The admin dashboard's random-profile generator. Loaded only when `VITE_MOCK_PROFILE=random` —
 * see `@mocks/mockRandom.ts` for the gate and the constraints.
 *
 * The ranges are deliberate: the point is not "different numbers every run", it is the numbers
 * that break a layout.
 *
 *   - counters span 0 to 7 digits, so both the cold-start dashboard (every tile reading zero) and
 *     the busy one (`totalRequests` wide enough to overflow its tile) actually occur
 *   - `loadAvg` is not pinned to length 3. The contract says "array of number"; a component that
 *     destructures `[one, five, fifteen]` is making an assumption the API never promised, and
 *     this is the only thing that will ever tell it so
 *   - `errorRate` is derived from the two counters rather than drawn independently, because a
 *     dashboard that shows 0 errors next to a 40% error rate is testing nothing but itself
 *
 * `status` stays `'ok'`: `AdminOverviewTab` renders a degraded database as an error state, and a
 * profile that randomly hid the whole dashboard behind it would spend most runs asserting nothing.
 */
import { faker } from '@mocks/mockRandom.ts';
import type { IMockObservability } from './seeds.ts';

export const buildRandomObservability = (): IMockObservability => {
    const totalRequests = faker.number.int({ min: 0, max: 9_999_999 });
    const totalErrors = faker.number.int({ min: 0, max: totalRequests });
    const uptimeSeconds = faker.number.int({ min: 0, max: 60 * 60 * 24 * 400 });
    const heapUsedMb = faker.number.int({ min: 1, max: 4096 });

    return {
        health: {
            status: 'ok',
            environment: faker.helpers.arrayElement(['development', 'staging', 'production']),
            service: faker.string.alpha({ length: { min: 1, max: 60 } }),
            nodeVersion: `v${faker.number.int({ min: 18, max: 30 })}.${faker.number.int({ min: 0, max: 20 })}.${faker.number.int({ min: 0, max: 20 })}`,
            uptimeSeconds,
            database: { status: 'connected' },
            integrations: {
                loki: faker.datatype.boolean(),
                otelEnabled: faker.datatype.boolean(),
                umami: faker.datatype.boolean(),
                faro: faker.datatype.boolean()
            },
            memory: {
                heapUsedMb,
                heapTotalMb: heapUsedMb + faker.number.int({ min: 0, max: 4096 }),
                rssMb: heapUsedMb + faker.number.int({ min: 0, max: 8192 })
            },
            system: {
                platform: faker.helpers.arrayElement(['linux', 'darwin', 'win32']),
                cpuCount: faker.number.int({ min: 1, max: 256 }),
                loadAvg: faker.helpers.multiple(
                    () => faker.number.float({ min: 0, max: 64, fractionDigits: 2 }),
                    { count: { min: 0, max: 5 } }
                )
            },
            timestamp: faker.date.recent().toISOString()
        },
        metrics: {
            http: {
                totalRequests,
                totalErrors,
                errorRate: totalRequests === 0 ? 0 : totalErrors / totalRequests,
                inFlight: faker.number.int({ min: 0, max: 5000 }),
                latencyMs: {
                    p50: faker.number.int({ min: 0, max: 5000 }),
                    p95: faker.number.int({ min: 0, max: 60_000 })
                }
            },
            auth: {
                loginSuccess: faker.number.int({ min: 0, max: 999_999 }),
                loginFailure: faker.number.int({ min: 0, max: 999_999 }),
                signupSuccess: faker.number.int({ min: 0, max: 999_999 })
            },
            business: {
                checkoutSuccess: faker.number.int({ min: 0, max: 999_999 }),
                ordersCreated: faker.number.int({ min: 0, max: 999_999 })
            },
            database: {
                queriesTotal: faker.number.int({ min: 0, max: 9_999_999 }),
                errorsTotal: faker.number.int({ min: 0, max: 9999 })
            },
            process: { uptimeSeconds, heapUsedMb },
            timestamp: faker.date.recent().toISOString()
        },
        /*
         * An empty page is included in the range on purpose — "no audit events yet" is the state
         * a freshly-migrated environment is actually in, and it is the one the table's empty
         * state exists for. `total` is drawn at or above the page size, never below it: the BE
         * counts every event matching the filters, not just the returned page, so a `total`
         * smaller than `items.length` is a shape the real API cannot produce.
         */
        audit: (() => {
            const items = faker.helpers.multiple(
                () => {
                    const outcome = faker.helpers.arrayElement(['success', 'failure'] as const);
                    return {
                        actor_user_id: faker.string.alphanumeric(24),
                        actor_role: faker.helpers.arrayElement([
                            'admin',
                            'user',
                            'anonymous'
                        ] as const),
                        action: faker.helpers.arrayElement([
                            'auth.login.succeeded',
                            'auth.login.failed',
                            'auth.logout',
                            'orders.create',
                            'products.update',
                            'users.delete',
                            'security.rate_limit.blocked'
                        ]),
                        outcome,
                        ip: faker.internet.ip(),
                        request_id: faker.string.alphanumeric(12),
                        trace_id: faker.string.alphanumeric(16),
                        timestamp: faker.date.recent().toISOString(),
                        level: outcome === 'failure' ? 'warn' : 'info'
                    };
                },
                { count: { min: 0, max: 50 } }
            );
            return {
                items,
                total: items.length + faker.number.int({ min: 0, max: 100_000 })
            };
        })()
    };
};
