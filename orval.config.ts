import { defineConfig } from 'orval';

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
 * mocks:       MSW handler stubs + faker factories → tests/mocks/generated.ts
 *              Use as a skeleton when adding a new endpoint.
 *              The rich in-memory-DB logic stays in tests/mocks/handlers/*.
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
                mutator: {
                    path: './src/plugins/http/index.ts',
                    name: 'orvalMutator'
                }
            }
        }
    },
    zodSchemas: {
        input: './openapi.yaml',
        output: {
            mode: 'single',
            target: './contracts/rest/schemas.zod.ts',
            client: 'zod'
        }
    },
    mocks: {
        input: './openapi.yaml',
        output: {
            mode: 'single',
            target: './tests/mocks/generated.ts',
            client: 'axios',
            mock: true
        }
    }
});
