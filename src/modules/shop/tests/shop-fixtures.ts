/**
 * Typed factory for the shop, proven against the generated response schema as every factory in
 * `tests/support/unit/fixtures.ts` is. Reachable by the modules that depend on `shop`.
 */
import { GetShopResponse } from '@api/schemas';
import { contractBody } from '../../../../tests/support/unit/orval-fixture-schema.ts';
import type { Shop } from '@types';

/**
 * A valid shop as `GET /shop` answers it — an Italian shop trading in euros, shipping to Italy.
 *
 * @param overrides - the fields a case actually cares about
 * @returns a `Shop` that parses against the generated schema
 */
export const aShop = (overrides: Partial<Shop> = {}): Shop =>
    contractBody<Shop>(GetShopResponse, {
        currency: 'EUR',
        minorUnits: 2,
        shipToCountries: ['IT'],
        returnAddress: { street: 'Via Roma 1', city: 'Milano', zip: '20100', country: 'IT' },
        returnPostagePayer: 'consumer',
        backorderPromiseDays: 30,
        timeZone: 'Europe/Rome',
        ...overrides
    });
