<script setup lang="ts">
/**
 * @module
 * A `pinned` navigation entry as the bar shows it: the glyph with its count badge, plus a short
 * live detail text (the cart's total) that hides on the narrowest screens. One accessible name
 * carries label, count and detail, so what a reader hears matches what a sighted visitor sees at
 * any width.
 */
import { mergeProps, useAttrs } from 'vue';
import type { Component } from 'vue';
import type { RouteLocationRaw } from 'vue-router';

/**
 * Non-prop attributes (`data-test`) belong on the button, not on the tooltip that wraps it —
 * see {@link buttonProps}.
 */
defineOptions({ inheritAttrs: false });

/**
 * Component props — see each field's own doc comment below.
 */
const props = defineProps<{
    /**
     * The translated label: the tooltip and the head of the accessible name.
     */
    label: string;
    /**
     * A lucide component.
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
     * The badge's accessible name, e.g. "3 items".
     */
    badgeLabel?: string;
    /**
     * The live text beside the glyph — a formatted total. Absent renders the glyph alone.
     */
    detail?: string;
}>();

/**
 * Non-prop attributes passed by the parent, merged with the tooltip's own activator props in
 * {@link buttonProps}.
 */
const attributes = useAttrs();

/**
 * The tooltip's hover/focus handlers and whatever the parent passed through, merged so neither
 * shadows the other — `mergeProps` chains same-named listeners instead of replacing them.
 *
 * @param tooltipProps - the activator props handed down by `<v-tooltip>`
 */
const buttonProps = (tooltipProps: Record<string, unknown>) => mergeProps(attributes, tooltipProps);

/**
 * The whole story in one name: "Cart: 3 items, €59.97". The visible detail is hidden below
 * `sm`, and the badge is a number with no subject, so the name cannot rely on either.
 *
 * @returns The string used for `aria-label`.
 */
const accessibleName = () =>
    [props.label, [props.badgeLabel, props.detail].filter(Boolean).join(', ')]
        .filter(Boolean)
        .join(': ');
</script>

<template>
    <v-tooltip :text="label" :aria-label="label" location="bottom">
        <template #activator="{ props: tooltipProps }">
            <!--
                The badge WRAPS the button, as `AppNavIconButton` does — nested inside a `v-btn`
                the count does not show. Anchored `top start` so it sits over the glyph, not over
                the detail text. `data-test` lands on it only while it shows, so "no badge" is
                testable.
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
                <v-btn
                    v-bind="buttonProps(tooltipProps)"
                    variant="text"
                    class="px-2"
                    :to="to"
                    :aria-label="accessibleName()"
                >
                    <component :is="icon" :size="20" aria-hidden="true" />
                    <!-- `aria-hidden`: already in the name above; a reader would hear it twice. -->
                    <span
                        v-if="detail"
                        class="ml-2 hidden font-medium normal-case tabular-nums sm:inline"
                        aria-hidden="true"
                        data-test="nav-detail"
                    >
                        {{ detail }}
                    </span>
                </v-btn>
            </v-badge>
        </template>
    </v-tooltip>
</template>
