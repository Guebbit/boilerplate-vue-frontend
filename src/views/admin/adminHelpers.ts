/**
 * Shared utilities for admin dashboard components.
 */

/**
 * Format an ISO-8601 timestamp as a locale-aware time string.
 * Falls back to the raw value if parsing fails.
 */
export const formatAdminTime = (iso: string): string => {
    try {
        return new Date(iso).toLocaleTimeString();
    } catch {
        return iso;
    }
};
