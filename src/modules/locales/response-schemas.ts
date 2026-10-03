/**
 * @module
 * This module's response-schema rows — every operation the generated table
 * (`contracts/rest/routes.ts`, from `openapi.yaml`'s `x-module` stamps) attributes to backend
 * `locales`. {@link ResponseSchemaRoute}'s own docblock states the two rules every row obeys.
 */
import * as schemas from '@api/schemas';
import { routesForModules } from '@/infrastructure/http/response-schema-map';
import type { ResponseSchemaRoute } from '@/infrastructure/http/response-schema-map';

/**
 * Response-envelope schemas for every locales endpoint this module calls.
 *
 * Registered through the module manifest, so enabling the domain turns its contract validation on
 * and deleting the folder turns it off. The i18n boot path's four reads are excluded here — see
 * `response-schema-map.ts`'s `SESSION_AND_BOOT_SCHEMA_NAMES`.
 */
export const localesResponseSchemas: ResponseSchemaRoute[] = routesForModules(schemas, ['locales']);
