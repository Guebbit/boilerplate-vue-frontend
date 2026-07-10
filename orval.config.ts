import { defineConfig } from 'orval';

/**
 * Orval configuration: generates the API client from openapi.yaml.
 *
 * api:         typed axios functions + TS types → contracts/rest/index.ts
 *              mutator delegates HTTP to apiMutator (auth headers, token refresh)
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
            mode: 'single',
            target: './contracts/rest/index.ts',
            client: 'axios',
            override: {
                mutator: {
                    path: './src/utils/apiMutator.ts',
                    name: 'apiMutator'
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
