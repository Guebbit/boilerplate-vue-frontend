/**
 * @module
 * Contract validation for `orvalMutator`: a feature flag plus a Zod parse against the schema
 * `response-schema-map.ts` resolves for the request, throwing loudly on a real mismatch and
 * logging (not throwing) on an unmapped route.
 */

import { z } from 'zod';
import { logger } from '@/infrastructure/utils/logger.ts';
import { useObservabilityStore } from '@/infrastructure/observability/store.ts';
import { translate } from '@/infrastructure/i18n';
import { isResponseSchemaTableLoading, resolveResponseSchema } from './response-schema-map.ts';
import type { AxiosRequestConfig } from 'axios';
import type { AxiosResponseErrorData } from './types.ts';

/**
 * Whether `orvalMutator` should parse every response through its contract schema before
 * resolving. `VITE_VALIDATE_RESPONSES` ('true'/'false') decides; unset defaults to ON — in
 * production too, not just `vite dev`.
 *
 * Production is the point: the generated envelope types promise `data` on every 2xx, and the
 * stores trust that promise instead of guarding every read. This gate is what makes the promise
 * true. What differs between profiles is what a mismatch DOES — see {@link isReportOnly}.
 *
 * The `MODE !== 'test'` half is load-bearing: Vitest also sets `DEV: true`, and plenty of unit
 * tests exercise `orvalMutator` against deliberately partial fixtures.
 *
 * FE-side mirror of the BE's `toSatisfyApiSpec()` contract tests: that suite asserts the API's
 * answers against `openapi.yaml` from the inside, this asserts them against the generated schemas
 * from the outside, over a real network and in every profile a person or a spec actually drives.
 */
export const shouldValidateResponses = (): boolean => {
    const flag = import.meta.env.VITE_VALIDATE_RESPONSES;
    if (flag === 'true') return true;
    if (flag === 'false') return false;
    return import.meta.env.MODE !== 'test';
};

/**
 * Whether a mismatch reports (production) rather than rejects (dev, unit, every e2e profile).
 *
 * Decided (FA-D2 = C): one added optional field on the backend must not turn into an outage for
 * every deployed frontend before it redeploys — production still catches drift, it just never
 * blocks a call on it. Unknown keys are stripped rather than rejected for the same reason; a
 * missing or mistyped field is still a real defect, so it is still reported, just not thrown.
 */
export const isReportOnly = (): boolean => import.meta.env.PROD;

/**
 * Parses a response body through the schema matching its request, rejecting on a mismatch.
 *
 * An unmapped route fails open — logged, not thrown — because a gap in the map means the map is
 * stale, not that the response is wrong.
 *
 * a contract mismatch is a defect in THIS deployment, never something a shopper caused or
 * can act on. The full issue list — which fields, which rule — is a developer diagnostic, so it
 * goes to Faro; what the rejection carries for a call site to show is the same generic envelope
 * every other unreadable failure gets.
 *
 * In {@link isReportOnly} mode, unknown keys are stripped before parsing — an additive backend
 * field is not this deployment's problem — and a remaining mismatch (a field missing or the
 * wrong type) is sent to Faro but never thrown; the caller gets the response exactly as it
 * arrived, same as validation being off. Dev, unit and every e2e profile keep throwing: that is
 * the whole point of catching drift where it happened, before it reaches production.
 *
 * @param config - The request config that produced `data` (used to resolve the schema).
 * @param data - The already-unwrapped response body.
 * @throws {AxiosResponseErrorData} When a mapped schema rejects the body outside report-only mode.
 */
export const validateResponseAgainstContract = (
    config: AxiosRequestConfig,
    data: unknown
): void => {
    const mappedSchema = resolveResponseSchema(config.method, config.url);
    if (!mappedSchema) {
        // The lazy schema chunk (FA94/FA-D2) is still loading: every route reads as unmapped
        // during this window, not just the ones that genuinely have no row — stay quiet rather
        // than warn about a gap that closes itself in a moment.
        if (!isResponseSchemaTableLoading()) {
            logger.warn(
                `[contract] no response schema mapped for ${(config.method ?? 'GET').toUpperCase()} ${config.url ?? '(no url)'} — skipping validation`
            );
        }
        return;
    }

    const reportOnly = isReportOnly();
    // `.strip()` only exists on an object schema — every generated envelope is one, but the
    // lookup's declared type is the wider `ZodType`, so this guards the cast.
    const schema =
        reportOnly && mappedSchema instanceof z.ZodObject ? mappedSchema.strip() : mappedSchema;

    const result = schema.safeParse(data);
    if (result.success) return;

    // Every issue, not just the first: one bad response usually means several fields drifted.
    const issues = result.error.issues
        .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('\n');
    const diagnostic = `[contract] response for ${(config.method ?? 'GET').toUpperCase()} ${config.url ?? '(no url)'} does not match the OpenAPI schema:\n${issues}`;
    useObservabilityStore().captureException(new Error(diagnostic));

    if (reportOnly) return;

    const message = translate('api-errors.unknown');

    // eslint-disable-next-line @typescript-eslint/only-throw-error -- the envelope IS this client's rejection contract; every catch downstream destructures it, same as `onResponseReject`
    throw {
        success: false,
        status: 0,
        message,
        errors: [{ code: 'CONTRACT_MISMATCH', message }]
    } satisfies AxiosResponseErrorData;
};
