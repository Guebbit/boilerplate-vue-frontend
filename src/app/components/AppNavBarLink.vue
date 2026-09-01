<script setup lang="ts">
/**
 * @module
 * One desktop-bar entry: a text link that leads with its lucide glyph and shows its label in
 * full, with an optional count badge on the glyph. The visible text IS the accessible name, so
 * unlike `AppNavIconButton` it needs neither `aria-label` nor a tooltip.
 */
import type { Component } from 'vue';
import type { RouteLocationRaw } from 'vue-router';

/**
 * Component props — see each field's own doc comment below.
 */
defineProps<{
    /**
     * The visible, translated label.
     */
    label: string;
    /**
     * A lucide component, shown before the label.
     */
    icon: Component;
    /**
     * Locale-prefixed destination.
     */
    to: RouteLocationRaw;
    /**
     * A count worn on the glyph. Zero or absent renders no badge.
     */
    badge?: number;
    /**
     * The badge's accessible name, e.g. "3 items" — without it Vuetify announces "Badge".
     */
    badgeLabel?: string;
}>();
</script>

<template>
    <!--
        The badge WRAPS the button, as `AppNavIconButton` does — nested inside a `v-btn` the
        count does not show. Anchored `top start` so it sits over the glyph, not over the label.
        `model-value` rather than `v-if`: the link is the same element with or without a count,
        so focus does not reset when a count changes. `data-test` lands on the badge only while
        it shows, so "no badge" is testable.
    -->
    <v-badge
        :model-value="Boolean(badge)"
        :content="badge"
        :label="badgeLabel"
        color="primary"
        location="top start"
        :offset-x="16"
        :data-test="badge ? 'nav-badge' : undefined"
    >
        <v-btn variant="text" class="px-3" :to="to">
            <component :is="icon" :size="18" aria-hidden="true" />
            <!-- Own `text-transform`, so the dictionary's lowercase labels read as the drawer's do. -->
            <span class="ml-2 capitalize">{{ label }}</span>
        </v-btn>
    </v-badge>
</template>
