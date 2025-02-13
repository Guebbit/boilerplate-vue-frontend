/**
 *
 */
export enum EUserRoles {
    ADMIN = 'admin',
    EDITOR = 'editor',
    VIP = 'vip',
    // USER = 'user', // this is the default role, if roles are empty this will be the role
}

/**
 * Remember me with different expiry times
 */
export enum ERefreshTokenExpiryTime {
    SHORT = "short",
    MEDIUM = "medium",
    LONG = "long"
}

/**
 *
 */
export interface IUser {
    id: number,
    email: string,
    username: string,
    phone: string,
    website: string,
    language: string,
    imageUrl: string,
    roles: EUserRoles[]
}

/**
 *
 */
export type IUserIdentification = IUser['id'];

/**
 * User form to edit its profile
 */
export interface IUserForm extends Pick<IUser, 'username' | 'email' | 'phone' | 'website'> {
    password: string
    passwordConfirm: string
    // image: string,  // TODO update from another API
}

/**
 * Admin form to create\edit users
 */
export interface IUserFormAdmin extends Omit<IUserForm, 'password' | 'passwordConfirm'> , Pick<IUser, 'roles'>{
    active: boolean
}
