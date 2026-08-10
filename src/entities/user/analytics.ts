/*
 * Payload for auth events based on email credentials.
 */
export interface IUserEmailAuthPayload {
    [key: string]: unknown;
    method: 'email';
}

/*
 * Build the standard payload for email-based auth events.
 *
 * @returns Canonical auth payload.
 */
export const buildEmailAuthPayload = (): IUserEmailAuthPayload => ({
    method: 'email'
});
