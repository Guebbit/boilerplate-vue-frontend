<script setup lang="ts">
import { mergeProps, useAttrs } from 'vue';
import type { Component } from 'vue';
import type { RouteLocationRaw } from 'vue-router';

/**
 * An icon-only button (or link) that still has a name.
 *
 * The desktop bar shows its entries as glyphs alone, which is only acceptable if every glyph
 * carries the text it stands for in two places: `aria-label` for the reader, a tooltip for the
 * sighted visitor who does not recognise the icon. The two are the SAME string, so a voice-control
 * user who reads the tooltip can say it (WCAG 2.5.3).
 *
 * Every attribute not declared as a prop — a menu activator's `aria-expanded` and click handler,
 * a `data-test` hook — falls through to the `<v-btn>`, so a parent can wrap this in `v-menu`.
 */
defineOptions({ inheritAttrs: false });

const props = defineProps<{
    /** The visible name: tooltip text and accessible name. */
    label: string;
    /** A lucide component. */
    icon: Component;
    /** When set, renders a link; otherwise a button. */
    to?: RouteLocationRaw;
    /** A count worn on the icon. Zero or absent renders no badge. */
    badge?: number;
    /** The badge's accessible name, e.g. "3 items" — without it Vuetify announces "Badge". */
    badgeLabel?: string;
    /**
     * Extra detail folded into the accessible name after the label, e.g. the signed-in email.
     * Keeps the tooltip short while the reader still hears who the account menu belongs to.
     */
    description?: string;
}>();

const attributes = useAttrs();

/**
 * Listeners and attributes from two sources, merged so neither shadows the other: the tooltip's
 * hover/focus handlers and whatever the parent passed through (a menu's activator props).
 * `mergeProps` chains same-named listeners instead of replacing them.
 *
 * @param tooltipProps - the activator props handed down by `<v-tooltip>`
 */
const buttonProps = (tooltipProps: Record<string, unknown>) => mergeProps(attributes, tooltipProps);

const accessibleName = () =>
    props.description ? `${props.label}: ${props.description}` : props.label;
</script>

<template>
    <!--
        `aria-label` on the tooltip as well: Vuetify mounts the `role="tooltip"` container before
        the text inside it is shown, and a tooltip node with no name is an axe failure on every
        page that has one — five of them, here, before anyone hovers.
    -->
    <v-tooltip :text="label" :aria-label="label" location="bottom">
        <template #activator="{ props: tooltipProps }">
            <!--
                `model-value` rather than `v-if` on the badge: the button is the same element with
                or without a count, so focus and the tooltip do not reset when a cart empties.
                `data-test` lands on the badge only while it shows, so "no badge" is testable.
            -->
            <v-badge
                :model-value="Boolean(badge)"
                :content="badge"
                :label="badgeLabel"
                color="primary"
                :data-test="badge ? 'nav-badge' : undefined"
            >
                <v-btn
                    v-bind="buttonProps(tooltipProps)"
                    icon
                    variant="text"
                    :to="to"
                    :aria-label="accessibleName()"
                >
                    <component :is="icon" :size="20" aria-hidden="true" />
                </v-btn>
            </v-badge>
        </template>
    </v-tooltip>
</template>
