/**
 * Realtime — public barrel.
 *
 * The only surface a sibling module may import. See any sibling's barrel for the rule.
 *
 * Note what is NOT here: `createSseClient`. Any domain wanting its own stream imports that from
 * `@/infrastructure/createSseClient` rather than through this module, which is what stops "someone needs SSE"
 * from turning into "everyone depends on realtime".
 */

export { useRealtimeObservabilityStore } from './realtimeObservability';
export { useRealtimeObservability } from './useRealtimeObservability';
