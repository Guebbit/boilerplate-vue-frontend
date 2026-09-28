<script setup lang="ts">
/**
 * @module
 * A `pinned` navigation entry as the bar shows it: the glyph with its count badge, plus a short
 * live detail text (the cart's total) that hides on the narrowest screens. One accessible name
 * carries label, count and detail, so what a reader hears matches what a sighted visitor sees at
 * any width.
 */
import { mergeProps, ref, useAttrs } from 'vue';
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
 * Whether the tooltip shows — driven explicitly by {@link openTooltipOnRealFocus} and
 * {@link closeTooltip} below, rather than `v-tooltip`'s own `open-on-focus` wiring. See the
 * template's `open-on-focus="false"` for why.
 */
const tooltipOpen = ref(false);

/**
 * Opens the tooltip on a real keyboard focus, mirroring the `:focus-visible` check Vuetify's own
 * `open-on-focus` makes — but that internal wiring also gates on a 50ms "reopen lock" left over
 * from the tooltip's LAST close, meant to stop an immediate re-open right after a click. Tab away
 * and Shift+Tab back inside that window (routine under real multi-shard e2e CPU contention) then
 * silently drops the reopen, because the lock is checked before the focus-visible read even runs.
 * Driving `v-model` here instead skips that lock entirely, since it lives only in Vuetify's own
 * activator wiring, which `open-on-focus="false"` turns off.
 * https://github.com/vuetifyjs/vuetify/blob/v4.1.5/packages/vuetify/src/components/VOverlay/useActivator.ts
 *
 * @param event - the native `focus` event
 */
const openTooltipOnRealFocus = (event: FocusEvent) => {
    if ((event.target as HTMLElement).matches(':focus-visible')) tooltipOpen.value = true;
};

/**
 * Closes the tooltip on blur. Simpler than Vuetify's own `onBlur` (which checks whether focus
 * moved INTO the tooltip's content) because this tooltip is never `interactive`, so focus can
 * never land there.
 */
const closeTooltip = () => {
    tooltipOpen.value = false;
};

/**
 * The tooltip's hover handlers and whatever the parent passed through, plus the explicit
 * focus/blur pair above — merged so neither shadows the other. `mergeProps` chains same-named
 * listeners instead of replacing them.
 *
 * @param tooltipProps - the activator props handed down by `<v-tooltip>`
 */
const buttonProps = (tooltipProps: Record<string, unknown>) =>
    mergeProps(attributes, tooltipProps, { onFocus: openTooltipOnRealFocus, onBlur: closeTooltip });

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
    <v-tooltip
        v-model="tooltipOpen"
        :open-on-focus="false"
        :text="label"
        :aria-label="label"
        location="bottom"
    >
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
