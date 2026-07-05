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

/*
 * Smooth-scroll to a page section by its element id.
 * IDs are always compile-time constants from our own components — no user input.
 * @param id - target element id (e.g. "home-contact")
 */
export const scrollToSection = (id: string) => {
    document.querySelector(`#${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
