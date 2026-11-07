/**
 * @module
 * Shop — public barrel. The shop's commerce settings (currency, ship-to countries, backorder
 * promise), read from `GET /shop`. `cart`, `delivery`, `orders` and `products` read
 * them through here; the module's own files reach `./shop` directly.
 */

export {
    backorderPromiseDays,
    loadShop,
    shipToCountries,
    shopCurrency,
    shopMinorUnits
} from './shop';
