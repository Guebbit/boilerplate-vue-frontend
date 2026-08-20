import { defineConfig } from 'orval';
import type { GeneratorVerbOptions } from '@orval/core';

/**
 * Seven operations accept the same payload as either JSON or multipart (anything with an
 * optional image: signup, create/update user, create/update product). Orval emits FormData
 * encoding ONLY for operations with a single request content type — with two, it hands the
 * body straight to the mutator and generates no encoding at all.
 *
 * `splitByContentType` fixes that by generating one function per content type, but names them
 * `createProductWithJson` / `createProductWithFormData`. This transformer restores the plain
 * name for JSON — so every JSON call site is untouched by the split — and uses `WithMultipart`
 * for the other, matching how the spec and the `*RequestMultipart` types already talk.
 *
 * Applied to the `api` output.
 *
 * Operations with a single content type never receive a suffix, so they fall through unchanged.
 */
const contentTypeOperationNames = (verb: GeneratorVerbOptions): GeneratorVerbOptions => {
    if (verb.body.contentType === 'application/json')
        return { ...verb, operationName: verb.operationName.replace(/WithJson$/, '') };
    if (verb.body.contentType === 'multipart/form-data')
        return {
            ...verb,
            operationName: verb.operationName.replace(/WithFormData$/, 'WithMultipart')
        };
    return verb;
};

/**
 * Orval configuration: generates the API client from openapi.yaml.
 *
 * Full output reference: https://orval.dev/docs/reference/configuration/output
 *
 * api:         typed axios functions + TS types → contracts/rest/index.ts
 *              mutator delegates HTTP to orvalMutator (auth headers, token refresh)
 *
 * zodSchemas:  Zod schemas matching each OpenAPI model → contracts/rest/schemas.zod.ts
 *              Import from @api/schemas to validate forms or parse API responses.
 *              Always in sync with the spec — never hand-write these.
 *
 * There is deliberately no `mocks` block. Orval can emit MSW stub handlers with faker data, and
 * this repo does not use them: dev and e2e run against the paired backend's demo profile — the
 * real API, in-memory and seeded — so a generated imitation would cover nothing the real thing
 * does not. If a backend-less, render-only mode is ever wanted (spec ahead of implementation, or
 * a checkout with no sibling repo), the clean wiring is `mode: 'split'` + `mock: true` here,
 * which emits the handlers into a separate `index.msw.ts` that only a flag-guarded dynamic
 * import would ever pull into a bundle.
 *
 * NOTE: every target below must also appear in the `api-freshness` job's pathspec in
 * .github/workflows/ci.yml, or changes to it ship unguarded.
 */
export default defineConfig({
    api: {
        input: './openapi.yaml',
        output: {
            // How operations are split across files. One of:
            // 'single'      - everything in one file (current choice)
            // 'split'       - one file's worth of impl + a separate schemas file
            // 'tags'        - one file per OpenAPI tag
            // 'tags-split'  - a folder per tag, each further split into impl/schemas
            mode: 'single',
            target: './contracts/rest/index.ts',
            // Shape of the generated client. Options include:
            // 'axios'            - factory function (e.g. getXxxAPI()) returning bound
            //                      methods; supports DI'ing a custom axios instance per call
            // 'axios-functions'  - (orval default) plain top-level exported functions, no factory
            // 'vue-query'        - wraps operations as TanStack Query composables (useXxxQuery/Mutation)
            // 'fetch'            - native fetch instead of axios
            // (angular/react-query/svelte-query/swr/zod/effect/hono/mcp also available,
            // not relevant to this axios + Pinia-store setup)
            // client: 'axios-functions',
            override: {
                // Routes every generated call through our shared http.ts instance
                // instead of orval's default bare axios.request(config).
                //
                // orvalMutator takes a second `options` parameter, so every generated function
                // exposes an `options?` argument forwarded to axios. That is what lets the
                // image uploads pass `onUploadProgress` through the generated client instead
                // of calling orvalMutator directly.
                mutator: {
                    path: './src/infrastructure/http/index.ts',
                    name: 'orvalMutator'
                },
                // One function per request content type — see contentTypeOperationNames above.
                splitByContentType: true,
                transformer: contentTypeOperationNames
            }
        }
    },
    zodSchemas: {
        input: './openapi.yaml',
        output: {
            mode: 'single',
            target: './contracts/rest/schemas.zod.ts',
            client: 'zod',
            override: {
                zod: {
                    // Emit `zod.strictObject` instead of `zod.object`, so an undeclared key is
                    // REJECTED rather than silently stripped.
                    //
                    // Why this is on: every object schema in openapi.yaml is
                    // `additionalProperties: false` (92 of them) — the two exceptions,
                    // `ErrorItem.details` and the audit `metadata` map, are free-form maps that
                    // generate as `zod.record` and are untouched by this flag, which only applies
                    // to fixed-shape objects. So the toggle is blanket but exactly right here.
                    //
                    // Without it, a response carrying more than the contract allows validates
                    // clean, and the extra key travels into the app as if the API had promised it.
                    //
                    // If a schema ever legitimately needs to accept unknown keys, model it as a
                    // free-form map in the spec. Do not turn this off.
                    strict: {
                        response: true,
                        body: true,
                        query: true,
                        param: true,
                        header: true
                    }
                }
            }
        }
    }
});
