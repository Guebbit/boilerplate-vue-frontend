/**
 * @module
 * Users — public barrel: this module's only surface for sibling modules to import. See any
 * sibling's barrel for the rule.
 *
 * Deliberately not the store: the two schemas are here because account's login, signup and
 * password-reset forms validate against the same field rules this module's own forms do.
 * Exporting them is what stops that agreement being re-typed — and re-diverging — in the other
 * domain. `USER_ROLES`/`userRoleOptions` are the same idea for the role vocabulary: the single
 * list every role select in this module reads from, published so a sibling widget (a self-service
 * role switch, say) can offer a subset of it rather than typing its own.
 *
 * That makes this edge `published-language` rather than a shared store, which is the whole
 * difference between the client and the server. On the backend `account → users` is a
 * `shared-kernel`: both write the same record. Here neither writes anything — the API does — so
 * what the two modules share is vocabulary, and vocabulary is the cheap kind of sharing.
 */

export { usersSchema, usersPasswordSchema } from './schemas';
export { USER_ROLES, userRoleOptions } from './roles';
