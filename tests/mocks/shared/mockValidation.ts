import * as zod from 'zod';

// openapi.yaml's ErrorResponse/ValidationErrorResponse schemas are shared components,
// not tied to a single operationId, so orval's zod codegen doesn't emit a named export
// for them the way it does for every `<operationId>Response`. This is the one schema in
// this file we hand-write instead of importing from '@api/schemas' — everything else
// should come from there so mock and contract can never silently drift apart.
// Named to match the PascalCase convention orval uses for every schema export in @api/schemas.
// eslint-disable-next-line @typescript-eslint/naming-convention
export const MockErrorResponse = zod.object({
    success: zod.literal(false),
    status: zod.number(),
    message: zod.string(),
    errors: zod
        .array(
            zod.object({
                code: zod.string(),
                message: zod.string(),
                details: zod.record(zod.string(), zod.unknown()).optional()
            })
        )
        .min(1)
});

/**
 * Validates a mock response payload against the OpenAPI contract before it is sent.
 * Throws loudly (failing the dev console / Cypress run / vitest suite) on any drift
 * between a handler's hand-written response and the schema generated from openapi.yaml.
 */
export const assertMockContract = <T>(schema: zod.ZodType<T>, data: unknown): T => {
    const result = schema.safeParse(data);
    if (result.success) return result.data;

    const issues = result.error.issues
        .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('\n');
    throw new Error(`[mock contract] response does not match the OpenAPI schema:\n${issues}`);
};
