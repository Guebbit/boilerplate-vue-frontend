<script setup lang="ts">
/**
 * @module
 * Icon-only nav button/link with a proper accessible name (tooltip text doubling as
 * `aria-label`). All non-prop attributes fall through to the underlying `<v-btn>` via
 * `useAttrs`/`mergeProps` so a parent can use this as a `v-menu` activator.
 */
import { mergeProps, ref, useAttrs } from 'vue';
import type { Component } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import LazyImage from '@/ui/molecules/LazyImage.vue';

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

/**
 * Component props — see each field's own doc comment below.
 */
const props = defineProps<{
    /**
     * The visible name: tooltip text and accessible name.
     */
    label: string;
    /**
     * A lucide component.
     */
    icon: Component;
    /**
     * When set, renders a link; otherwise a button.
     */
    to?: RouteLocationRaw;
    /**
     * A count worn on the icon. Zero or absent renders no badge.
     */
    badge?: number;
    /**
     * The badge's accessible name, e.g. "3 items" — without it Vuetify announces "Badge".
     */
    badgeLabel?: string;
    /**
     * Extra detail folded into the accessible name after the label, e.g. the signed-in email.
     * Keeps the tooltip short while the reader still hears who the account menu belongs to.
     */
    description?: string;
    /**
     * Renders the visitor's own picture in place of {@link icon}. Set on the ACCOUNT button and
     * nowhere else — every other entry in the bar stands for a destination, and a destination has
     * an icon, not a portrait.
     *
     * Passing it with no URL is still meaningful: the avatar becomes the shared missing-image
     * placeholder, which says "you have no picture set" where a generic person glyph says nothing.
     */
    avatar?: boolean;
    /**
     * The visitor's `imageUrl`, unresolved. Only read when {@link avatar} is set.
     */
    avatarUrl?: string | null;
    /**
     * The visitor's `thumbnailUrl`, unresolved. Only read when {@link avatar} is set; absent when
     * the account image is a remote/default URL rather than an upload, or its digest job has not
     * finished yet.
     */
    avatarThumbnailUrl?: string | null;
}>();

/**
 * Non-prop attributes passed by the parent (e.g. a menu activator's handlers), merged
 * with the tooltip's own activator props in {@link buttonProps}.
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
 * Listeners and attributes from three sources, merged so neither shadows the other: the tooltip's
 * hover handlers, whatever the parent passed through (a menu's activator props), and the explicit
 * focus/blur pair above. `mergeProps` chains same-named listeners instead of replacing them.
 *
 * @param tooltipProps - the activator props handed down by `<v-tooltip>`
 */
const buttonProps = (tooltipProps: Record<string, unknown>) =>
    mergeProps(attributes, tooltipProps, { onFocus: openTooltipOnRealFocus, onBlur: closeTooltip });

/**
 * The button's accessible name: the label alone, or the label plus {@link description}
 * when the caller supplied one (the account menu's signed-in email, say).
 *
 * @returns The string used for both `aria-label` and the tooltip.
 */
const accessibleName = () =>
    props.description ? `${props.label}: ${props.description}` : props.label;
</script>

<template>
    <!--
        `aria-label` on the tooltip as well: Vuetify mounts the `role="tooltip"` container before
        the text inside it is shown, and a tooltip node with no name is an axe failure on every
        page that has one — five of them, here, before anyone hovers.
    -->
    <v-tooltip
        v-model="tooltipOpen"
        :open-on-focus="false"
        :text="label"
        :aria-label="label"
        location="bottom"
    >
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
                    <!--
                        `alt=""`: the button already carries the whole accessible name, and a
                        reader that also announced the image would say the account twice.
                    -->
                    <LazyImage
                        v-if="avatar"
                        :src="avatarUrl"
                        :thumbnail-src="avatarThumbnailUrl"
                        alt=""
                        :width="28"
                        :height="28"
                        rounded="rounded-full"
                    />
                    <component :is="icon" v-else :size="20" aria-hidden="true" />
                </v-btn>
            </v-badge>
        </template>
    </v-tooltip>
</template>
