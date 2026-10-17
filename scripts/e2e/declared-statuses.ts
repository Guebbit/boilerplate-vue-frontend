/**
 * Which HTTP statuses the contract declares for one operation — the guard behind a stubbed
 * failure row.
 *
 * A stub answering a status the contract never lists for that operation tests a branch the
 * server cannot produce, which is spec drift. The Cypress task in `cypress.config.ts` reads the
 * synced root `openapi.yaml` and asks this.
 *
 * Pure over the YAML text, so the unit suite pins it without a browser.
 */
import { parse } from 'yaml';

/** The slice of an OpenAPI document this module reads. */
interface OpenApiPaths {
    paths?: Record<string, Record<string, { responses?: Record<string, unknown> } | undefined>>;
}

/**
 * The numeric statuses an operation declares, ascending. `default` and range keys (`4XX`) are
 * not a status a stub could name, so they are skipped.
 *
 * @param openApiYaml - the text of `openapi.yaml`
 * @param method - the HTTP verb, any case
 * @param pathTemplate - the path as the contract spells it, e.g. `/orders/{id}/cancel`
 * @returns the statuses; empty when the operation is not in the contract
 */
export const declaredStatuses = (
    openApiYaml: string,
    method: string,
    pathTemplate: string
): number[] => {
    const document = parse(openApiYaml) as OpenApiPaths;
    const responses = document.paths?.[pathTemplate]?.[method.toLowerCase()]?.responses ?? {};
    return Object.keys(responses)
        .filter((key) => /^\d{3}$/.test(key))
        .map(Number)
        .toSorted((a, b) => a - b);
};
