/**
 * Get cookie by name (if exists and is NOT httpOnly)
 * @param name
 */
export const getCookie = (name: string) => {
    const match = new RegExp('(^| )' + name + '=([^;]+)').exec(document.cookie);
    return match ? match[2] : undefined;
}
