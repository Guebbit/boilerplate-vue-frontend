/**
 * @module
 * Re-exports the contract's address field bounds under one neutral name, so the views that
 * validate an address (`.vue` files cannot import `@api` directly) share the API's own limits.
 */
import {
    createAddressBodyLabelMax,
    createAddressBodyFullNameMax,
    createAddressBodyStreetMax,
    createAddressBodyCityMax,
    createAddressBodyZipMax,
    createAddressBodyPhoneMax
} from '@api/schemas';

/**
 * Maximum length of each address field, as the API enforces it (`CreateAddressRequest.maxLength`).
 */
export const ADDRESS_MAX = {
    label: createAddressBodyLabelMax,
    fullName: createAddressBodyFullNameMax,
    street: createAddressBodyStreetMax,
    city: createAddressBodyCityMax,
    zip: createAddressBodyZipMax,
    phone: createAddressBodyPhoneMax
} as const;
