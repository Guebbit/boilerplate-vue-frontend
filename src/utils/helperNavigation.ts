/**
 * Login page "continue to page" but with error filtering
 *
 * @param path
 */
export const loginContinueTo = (path: string, locale?: string) => {
    const parameters = locale ? { locale } : undefined;
    if (path.includes('error'))
        return {
            name: 'Login',
            params: parameters
        };

    return {
        name: 'Login',
        params: parameters,
        query: {
            continue: path
        }
    };
};
