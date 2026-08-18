import { logger } from '@/infrastructure/utils/logger.ts';
import { resolveResponseSchema } from './responseSchemaMap.ts';
import type { AxiosRequestConfig } from 'axios';

/**
 * Whether `orvalMutator` should parse every response through its contract schema before
 * resolving. `VITE_VALIDATE_RESPONSES` ('true'/'false') decides; unset defaults to on for an
 * actual `vite dev` server, so it fires during ordinary local development too.
 *
 * The `MODE !== 'test'` half is load-bearing: Vitest also sets `DEV: true`, and plenty of unit
 * tests exercise `orvalMutator` against deliberately partial fixtures.
 *
 * FE-side mirror of the BE's `toSatisfyApiSpec()` contract tests — MSW responses are checked by
 * `assertMockContract` where they are built, this covers a live backend's.
 */
export const shouldValidateResponses = (): boolean => {
    const flag = import.meta.env.VITE_VALIDATE_RESPONSES;
    if (flag === 'true') return true;
    if (flag === 'false') return false;
    return Boolean(import.meta.env.DEV) && import.meta.env.MODE !== 'test';
};

/**
 * Parses a response body through the schema matching its request, throwing loudly on a mismatch.
 *
 * An unmapped route fails open — logged, not thrown — because a gap in the map means the map is
 * stale, not that the response is wrong.
 *
 * @param config - The request config that produced `data` (used to resolve the schema).
 * @param data - The already-unwrapped response body.
 */
export const validateResponseAgainstContract = (
    config: AxiosRequestConfig,
    data: unknown
): void => {
    const schema = resolveResponseSchema(config.method, config.url);
    if (!schema) {
        logger.warn(
            `[contract] no response schema mapped for ${(config.method ?? 'GET').toUpperCase()} ${config.url ?? '(no url)'} — skipping validation`
        );
        return;
    }

    const result = schema.safeParse(data);
    if (result.success) return;

    // Every issue, not just the first: one bad response usually means several fields drifted.
    const issues = result.error.issues
        .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('\n');
    throw new Error(
        `[contract] response for ${(config.method ?? 'GET').toUpperCase()} ${config.url ?? '(no url)'} does not match the OpenAPI schema:\n${issues}`
    );
};
