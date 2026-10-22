/**
 * @module
 * Users — public barrel: this module's only surface for sibling modules to import. See any
 * sibling's barrel for the rule.
 *
 * Deliberately not the store: the two schemas are here because account's login, signup and
 * password-reset forms validate against the same field rules this module's own forms do.
 * Exporting them is what stops that agreement being re-typed — and re-diverging — in the other
 * domain.
 *
 * What the two modules share is vocabulary, not a store: neither writes anything — the API does.
 * `docs/modules/users.md` § "The map" names the relationship.
 */

export { usersSchema, usersPasswordSchema } from './schemas';
