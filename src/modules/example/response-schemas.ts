/**
 * @module
 * In any module: the response-schema rows of the operations the generated table attributes to the
 * backend module of the same name; {@link ResponseSchemaRoute}'s docblock states the two rules every
 * row obeys.
 * Here: every `example` operation, picked up by the table without a line per route.
 * See: docs/theory/modules.md#the-module-template
 */
import * as schemas from '@api/schemas';
import { routesForModules } from '@/infrastructure/http/response-schema-map';
import type { ResponseSchemaRoute } from '@/infrastructure/http/response-schema-map';

/**
 * Response-envelope schemas for every example endpoint this module calls.
 *
 * Registered through the module manifest, so enabling the domain turns its contract validation on
 * and deleting the folder turns it off.
 */
export const exampleResponseSchemas: ResponseSchemaRoute[] = routesForModules(schemas, ['example']);
