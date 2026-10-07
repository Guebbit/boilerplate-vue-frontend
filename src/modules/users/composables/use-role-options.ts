/**
 * @module
 * The options of every role select in this module, read from the server: the roles the signed-in
 * caller may assign, as `GET /account/abilities` published them. There is no list in this repo to
 * drift, and the picker offers exactly what the write would accept instead of a role it would
 * answer `409` to.
 */
import { useSessionStore } from '@/infrastructure/session.ts';

/**
 * One `v-select` option. Value and title are the same raw name: roles are data a deployment may
 * rename or add to, not an enum with translated titles.
 */
export interface RoleOption {
    value: string;
    title: string;
}

/**
 * The role options for the signed-in caller.
 *
 * @returns `grantableRoles` — the names the caller may assign, empty when they may assign none —
 *  and `roleOptions`, which builds the select's items.
 */
export const useRoleOptions = () => {
    /** The session, whose `grantableRoles` is what the server last answered. */
    const session = useSessionStore();

    /**
     * Select items: the grantable roles, plus the target's current role so the select can still
     * show a value the caller could not assign themselves.
     *
     * @param currentRole - the role the edited account holds now, if any
     */
    const roleOptions = (currentRole?: string): RoleOption[] => {
        const names = new Set(session.grantableRoles);
        if (currentRole) names.add(currentRole);
        return [...names].map((role) => ({ value: role, title: role }));
    };

    return { grantableRoles: () => session.grantableRoles, roleOptions };
};
