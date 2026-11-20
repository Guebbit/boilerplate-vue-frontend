/**
 * @module
 * This module's response-schema rows — every operation the generated table
 * (`contracts/rest.generated/routes.ts`, from `openapi.yaml`'s `x-module` stamps) attributes to backend
 * `shop-tasks`. {@link ResponseSchemaRoute}'s own docblock states the two rules every row obeys.
 */
import * as schemas from '@api/schemas';
import { routesForModules } from '@/infrastructure/http/response-schema-map';
import type { ResponseSchemaRoute } from '@/infrastructure/http/response-schema-map';

/**
 * Response-envelope schemas for every shop-tasks endpoint this module calls.
 */
export const shopTasksResponseSchemas: ResponseSchemaRoute[] = routesForModules(schemas, [
    'shop-tasks'
]);
