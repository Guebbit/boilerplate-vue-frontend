/**
 * @module
 * This module's response-schema rows — every operation the generated table
 * (`contracts/rest/routes.ts`, from `openapi.yaml`'s `x-module` stamps) attributes to backend
 * `payments`. {@link ResponseSchemaRoute}'s own docblock states the two rules every row obeys.
 */
import * as schemas from '@api/schemas';
import { routesForModules } from '@/infrastructure/http/response-schema-map';
import type { ResponseSchemaRoute } from '@/infrastructure/http/response-schema-map';

/**
 * Response-envelope schemas for every payments endpoint this module calls.
 *
 * Registered through the module manifest, so enabling the domain turns its contract validation on
 * and deleting the folder turns it off.
 */
export const paymentsResponseSchemas: ResponseSchemaRoute[] = routesForModules(schemas, [
    'payments'
]);
