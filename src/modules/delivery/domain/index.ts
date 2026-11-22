/**
 * @module
 * Delivery — domain layer. Pure rules, lint-guaranteed free of Vue, Pinia, axios and every tier.
 * @see docs/understand/domain-layer.md
 */

export { readShipLines, shipmentCount, shippableLines } from './ship-lines';
export type { ShipLineInput, ShipLinesVerdict } from './ship-lines';
