/**
 * Users — public barrel.
 *
 * The only surface a sibling module may import. See any sibling's barrel for the rule.
 *
 * The two schemas are here because account's login, signup and password-reset forms validate
 * against the same field rules this module's own forms do. Exporting them is what stops that
 * agreement being re-typed — and re-diverging — in the other domain.
 */

export { useUsersStore } from './store';
export { usersSchema, usersPasswordSchema } from './schemas';
