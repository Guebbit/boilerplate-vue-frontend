<script setup lang="ts">
/**
 * @module
 * A detail page's hero: the record's picture (or a fallback icon tile when the record has none)
 * beside its title/eyebrow/description. Whether a picture renders at all is `hasImage`, a
 * property of the record's TYPE — see the prop doc for why it is not inferred from `imageUrl`.
 */
import CardDetail from '@/ui/organisms/CardDetail.vue';
import LazyImage from '@/ui/molecules/LazyImage.vue';

/**
 * Component props — see each field's own doc comment below.
 *
 * No default on `hasImage`: Vue already casts an absent boolean prop to `false`.
 */
const { hasImage } = defineProps<{
    /**
     * Main heading.
     */
    title: string;
    /**
     * Body copy under the title.
     */
    description: string;
    /**
     * Small line above the title, e.g. a category or status.
     */
    eyebrow?: string | number | null;
    /**
     * Whether this kind of record HAS a picture at all — not whether this particular one does.
     *
     * The distinction is the whole reason it is a separate prop from `imageUrl`. A product and a
     * user both have an image field, so their heroes show a picture, and one with an empty field
     * shows the stand-in that says so. An ORDER has no image field, and rendering a stand-in there
     * would invent a missing picture for a record that was never going to have one — so an order's
     * hero keeps the icon it has always had, by simply not passing this.
     */
    hasImage?: boolean;
    /**
     * The record's `imageUrl`, unresolved. Only read when {@link hasImage} is set.
     */
    imageUrl?: string | null;
    /**
     * The record's `thumbnailUrl`, unresolved. Only read when {@link hasImage} is set; absent for
     * a record whose image is a remote/default URL rather than an upload, or whose digest job has
     * not finished yet.
     */
    thumbnailUrl?: string | null;
    /**
     * What the picture shows, for a reader who cannot see it. Required whenever `hasImage` is.
     */
    imageAlt?: string;
}>();
</script>

<template>
    <CardDetail class="detail-hero grid items-center gap-5 sm:grid-cols-[auto_minmax(0,1fr)]">
        <LazyImage
            v-if="hasImage"
            :src="imageUrl"
            :thumbnail-src="thumbnailUrl"
            :alt="imageAlt ?? title"
            :width="72"
            :height="72"
            :eager="true"
            rounded="rounded-3xl"
            class="shadow-lg"
        />
        <!--
            The icon tile the hero has always been, still the default: `h-18 w-18` matches the
            image's 72px box so swapping one for the other cannot move the text beside it.
        -->
        <div
            v-else
            class="grid h-18 w-18 place-items-center rounded-3xl text-3xl shadow-lg bg-gradient-to-br from-[rgb(var(--detail-accent))] to-[rgb(var(--detail-accent))]/65 text-surface"
            aria-hidden="true"
        >
            <slot name="icon" />
        </div>
        <div>
            <p
                v-if="eyebrow !== undefined && eyebrow !== null"
                class="mb-1 text-xs uppercase tracking-[0.12em] opacity-80"
            >
                {{ eyebrow }}
            </p>
            <h2 class="text-2xl font-bold leading-tight">{{ title }}</h2>
            <p class="mt-2 leading-relaxed opacity-75">{{ description }}</p>
        </div>
    </CardDetail>
</template>

<style scoped>
/* soft accent glow in the hero corner, driven by the page accent */
.detail-hero {
    background:
        radial-gradient(circle at top right, rgb(var(--detail-accent) / 0.16), transparent 38%),
        rgb(var(--v-theme-surface));
}
</style>
