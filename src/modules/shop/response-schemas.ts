/**
 * @module
 * This module's response-schema rows: `GET /shop`, the one operation the generated table
 * (`contracts/rest.generated/routes.ts`, from `openapi.yaml`'s `x-module` stamps) attributes to backend `shop`.
 */
import * as schemas from '@api/schemas';
import { routesForModules } from '@/infrastructure/http/response-schema-map';
import type { ResponseSchemaRoute } from '@/infrastructure/http/response-schema-map';

/**
 * Response-envelope schemas for the shop's endpoints. Registered through the module manifest, so
 * deleting the folder turns the validation off with it.
 */
export const shopResponseSchemas: ResponseSchemaRoute[] = routesForModules(schemas, ['shop']);
