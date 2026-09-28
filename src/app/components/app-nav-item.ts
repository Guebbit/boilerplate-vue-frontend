/**
 * @module
 * `AppNavItem`, pulled out of `AppNavMenu.vue` into its own plain `.ts` file (FA95): a type
 * exported from a `.vue` SFC is a shape TypeScript-ESLint's type-aware rules cannot always
 * resolve, which surfaced as `no-unsafe-*` noise everywhere `AppNavigation.vue` used the type once
 * `allowComponentTypeUnsafety` stopped papering over it. The shape itself is plain data — nothing
 * here is SFC-specific — so it belongs in a `.ts` file both components import, not in either one.
 */
import type { Component } from 'vue';
import type { RouteLocationRaw } from 'vue-router';

/**
 * One navigation entry, resolved for the current visitor: translated, locale-prefixed, counted.
 */
export interface AppNavItem {
    /**
     * Route name, stable across locales — the `key` of every render.
     */
    name: string;
    /**
     * Translated label.
     */
    title: string;
    /**
     * Locale-prefixed destination.
     */
    to: RouteLocationRaw;
    /**
     * Lucide icon shown before the label; entries with none render no icon slot.
     */
    icon?: Component;
    /**
     * Live count; `undefined` renders no badge.
     */
    badge?: number;
    /**
     * Live text beside the icon of a pinned entry; `undefined` renders none.
     */
    detail?: string;
    /**
     * Lifted out of its section's menu onto the bar, beside the account menu.
     */
    pinned?: boolean;
}
