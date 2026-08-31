<script setup lang="ts">
/**
 * @module
 * One record's picture, in three tiers: thumbnail first, full image lazily, a bundled placeholder
 * icon when there is neither.
 *
 * ── Why a component and not an `<img>` ───────────────────────────────────────────────────────
 * Every place this app shows a stored image has the same four things to get right, and no place
 * had all four: the API path has to be resolved against the API host (see `resolveImageUrl`), a
 * missing image needs a stand-in rather than a broken-icon glyph, an image below the fold should
 * not be fetched until it is near, and a box of known proportions has to be reserved up front or
 * the row jumps when the bytes land.
 *
 * ── The two-tier load ────────────────────────────────────────────────────────────────────────
 * When the caller passes `thumbnailSrc`, the small variant paints immediately, blurred and
 * slightly overscaled — the blur is what makes a low-resolution upscale read as "loading" instead
 * of "bad picture", and the overscale hides the soft edge blur leaves behind. The full image fades
 * in over it once decoded.
 *
 * `thumbnailSrc` and `src` are two independent fields on the record (`thumbnailUrl`/`imageUrl`),
 * not one derived from the other — the backend promotes them to distinct paths, a small WebP
 * derivative and the digested original, so there is no `width` parameter to ask for here. A
 * record with no thumbnail (a remote/default image, or a digest job still pending) simply omits
 * `thumbnailSrc`, and this behaves as a plain lazy image — the degradation every caller already
 * had to handle before thumbnails existed at all.
 */
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { placeholderImageUrl, resolveImageUrl } from '@/infrastructure/utils/images.ts';

// `eager` takes no default: Vue casts an absent boolean prop to `false` already, and restating it
// is the one thing `no-useless-default-assignment` is there to catch.
const {
    src,
    thumbnailSrc,
    alt,
    width = 96,
    height = 96,
    eager,
    rounded = 'rounded'
} = defineProps<{
    /**
     * The record's `imageUrl`, exactly as the API returned it — resolving it is this component's
     * job, and a caller that resolves it first is a caller doing the same work twice.
     */
    src?: string | null;
    /**
     * The record's `thumbnailUrl`, exactly as the API returned it — resolving it is this
     * component's job, same as {@link src}. Absent for a record whose image is a remote/default
     * URL rather than an upload, or whose digest job has not finished yet; either way the
     * component simply skips the first tier.
     */
    thumbnailSrc?: string | null;
    /**
     * What the picture shows, for a reader who cannot see it. Required, and deliberately not
     * defaulted: an image of a product is `alt="Photo of <title>"`, and only the caller knows the
     * title. The placeholder overrides it with its own wording — the placeholder icon is not a
     * picture of the product, and announcing it as one is a lie told to exactly the visitors who
     * cannot check.
     *
     * The ONE value never overridden is the empty string, which is a decision and not an omission:
     * `alt=""` means "this image is decorative, skip it", and it stays skipped in every tier. The
     * account button in the navigation is the case — the button already carries the whole
     * accessible name, so an avatar that announced itself would say the account twice, and a
     * MISSING avatar announcing the placeholder wording would be worse still.
     */
    alt: string;
    /**
     * Display width in CSS pixels.
     */
    width?: number;
    /**
     * Display height in CSS pixels. With `width`, reserves the box before any byte arrives.
     */
    height?: number;
    /**
     * Loads immediately instead of when scrolled near. For the one image that is certainly
     * above the fold — a detail page's hero — where lazy loading only delays the largest
     * contentful paint it was meant to protect.
     */
    eager?: boolean;
    /**
     * Corner rounding, as a Tailwind class. `rounded-full` makes it an avatar.
     */
    rounded?: string;
}>();

const { t } = useI18n();

/**
 * Set when the browser gives up on the resolved URL — a deleted file, a stopped API.
 */
const failed = ref(false);

/**
 * Set once the full image has decoded, which is when the thumbnail underneath may go.
 */
const loaded = ref(false);

// A new record in the same component instance (a table row recycled by `v-for`, a route param
// change) arrives with a URL that has not failed and has not loaded, and must be treated that
// way: without this, one broken image leaves every subsequent row showing the placeholder.
watch(
    () => src,
    () => {
        failed.value = false;
        loaded.value = false;
    }
);

/**
 * The full image's URL, or `undefined` when there is no image or the one there is has failed.
 */
const fullSource = computed(() => (failed.value ? undefined : resolveImageUrl(src)));

/**
 * The first tier: the small variant, when the caller passed one.
 *
 * Stays mounted after the full image has decoded rather than unmounting on `loaded`. Removing it
 * at the moment the fade STARTS leaves 300ms of empty box, since the layer fading in is still
 * transparent; underneath a fully opaque image it costs nothing to leave in place.
 */
const thumbnailSource = computed(() => (failed.value ? undefined : resolveImageUrl(thumbnailSrc)));

/**
 * Whether what is on screen is a stand-in rather than this record's own picture.
 */
const isPlaceholder = computed(() => fullSource.value === undefined);

/**
 * The URL actually rendered: the full image, or the bundled placeholder when there is none.
 */
const displayedSource = computed(() => fullSource.value ?? placeholderImageUrl());

/**
 * The box, reserved before anything loads so a late image cannot reflow the row around it.
 */
const boxStyle = computed(() => ({
    width: `${width}px`,
    aspectRatio: `${width} / ${height}`
}));
</script>

<template>
    <div
        class="relative shrink-0 overflow-hidden bg-surface-variant"
        :class="rounded"
        :style="boxStyle"
        :data-placeholder="isPlaceholder ? 'true' : undefined"
        data-test="lazy-image"
    >
        <!--
            Decorative by construction: it is the same picture as the one below it, one tier
            coarser, and a reader that announced both would announce the image twice.
        -->
        <img
            v-if="thumbnailSource"
            :src="thumbnailSource"
            alt=""
            aria-hidden="true"
            data-test="lazy-image-thumbnail"
            class="absolute inset-0 h-full w-full scale-105 object-cover blur-sm"
        />

        <!--
            `loading` and `decoding` are the native pair, in preference to an IntersectionObserver:
            the browser's own heuristics account for scroll velocity and connection type, which an
            observer with a fixed root margin cannot.
        -->
        <img
            :src="displayedSource"
            :alt="isPlaceholder && alt !== '' ? t('image.placeholder-alt') : alt"
            :loading="eager ? 'eager' : 'lazy'"
            decoding="async"
            class="relative h-full w-full object-cover transition-opacity duration-300"
            :class="thumbnailSource && !loaded ? 'opacity-0' : 'opacity-100'"
            @load="loaded = true"
            @error="failed = true"
        />
    </div>
</template>
