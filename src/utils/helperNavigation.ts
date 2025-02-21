/**
 * Login page "continue to page" but with error filtering
 *
 * @param path
 */
export const loginContinueTo = (path: string) => {
    if(path.includes('error'))
        return {
            name: 'Login'
        }

    // TODO what if path has a different language?
    return {
        name: 'Login',
        query: {
            continue: path,
        }
    }
}