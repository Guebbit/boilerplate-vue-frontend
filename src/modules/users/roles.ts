/**
 * @module
 * The user roles an admin screen may assign — the tenant-scope presets from the paired backend's
 * `shared/authorization-roles.yaml`, minus `operator` (platform scope, granted outside any
 * tenant's admin screens, never through this module).
 *
 * A flat list rather than a fetched one: there is no `GET /roles` endpoint, and the shared YAML is
 * a backend build input, not a runtime asset this client can read. A role a deployment adds to
 * that file needs a matching addition here to become selectable from `UserCreate.vue`,
 * `UserEdit.vue` and `UserAccessDialog.vue` — the one place all three now read it from, so it
 * never drifts into three separately typed lists.
 */
export const USER_ROLES = [
    'unverified',
    'customer',
    'manager',
    'warehouse',
    'support',
    'editor',
    'moderator',
    'admin'
] as const;

/**
 * `v-select` options for {@link USER_ROLES}. Value and title are the same raw name: roles are
 * data a deployment may rename or add to, not a fixed enum with translated titles — the same
 * reason `UsersList.vue`'s role column prints the raw string rather than a translation.
 */
export const userRoleOptions = USER_ROLES.map((role) => ({ value: role, title: role }));
