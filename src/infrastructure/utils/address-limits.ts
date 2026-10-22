/**
 * @module
 * Re-exports the contract's address field bounds under one neutral name, so the views that
 * validate an address (`.vue` files cannot import `@api` directly) share the API's own limits.
 */
import {
    addAddressBodyLabelMax,
    addAddressBodyFullNameMax,
    addAddressBodyStreetMax,
    addAddressBodyCityMax,
    addAddressBodyZipMax,
    addAddressBodyPhoneMax
} from '@api/schemas';

/**
 * Maximum length of each address field, as the API enforces it (`AddressInput.maxLength`).
 */
export const ADDRESS_MAX = {
    label: addAddressBodyLabelMax,
    fullName: addAddressBodyFullNameMax,
    street: addAddressBodyStreetMax,
    city: addAddressBodyCityMax,
    zip: addAddressBodyZipMax,
    phone: addAddressBodyPhoneMax
} as const;
