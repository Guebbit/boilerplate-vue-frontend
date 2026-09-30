<script setup lang="ts">
/**
 * @module
 * The product page's heart, contributed to the `product-actions` slot by this module's manifest —
 * the products module owns the page and never imports the wishlist. Renders nothing for a guest,
 * who has no wishlist to ask for. A failed toggle blocks this one button in place.
 */
import { onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { Heart } from 'lucide-vue-next';
import { useSessionStore } from '@/infrastructure/session.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import type { Product } from '@types';
import { useWishlistStore } from '../store';

/**
 * The product the heart saves or unsaves.
 */
const { product } = defineProps<{
    product: Product;
}>();

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Whether a visitor is signed in.
 */
const { isAuth } = storeToRefs(useSessionStore());

/**
 * The wishlist store, and whether a toggle is already in flight — the double-click guard; a
 * failure is {@link error}'s job instead.
 */
const wishlist = useWishlistStore();
const { loading } = storeToRefs(wishlist);

/**
 * The toggle's own blocked state.
 */
const { message: error, report: reportError, clear: clearError } = useBlockingError();

/**
 * Toggles the heart: a saved product leaves the wishlist, everything else joins it.
 *
 * @returns Nothing; a failure blocks the button in place ({@link error}) — the heart itself is
 *  the success feedback.
 */
const handleToggle = () => {
    clearError();
    (wishlist.isSaved(product.id)
        ? wishlist.removeFromWishlist(product.id)
        : wishlist.addToWishlist(product.id)
    ).catch(reportError);
};

// The heart needs to know what is already saved; fire-and-forget, it is decoration on the page.
// Shared: a grid mounts one heart per card, and they all wait on the same single read.
onMounted(() => {
    if (isAuth.value) void wishlist.ensureWishlist();
});
</script>

<template>
    <div v-if="isAuth" class="flex flex-col gap-2">
        <v-btn
            variant="tonal"
            :color="wishlist.isSaved(product.id) ? 'secondary' : undefined"
            data-test="wishlist-toggle"
            :disabled="loading"
            :aria-label="
                wishlist.isSaved(product.id)
                    ? t('wishlist-toggle.button-unsave')
                    : t('wishlist-toggle.button-save')
            "
            @click="handleToggle"
        >
            <Heart
                :size="18"
                class="mr-1"
                :fill="wishlist.isSaved(product.id) ? 'currentColor' : 'none'"
                aria-hidden="true"
            />
            {{
                wishlist.isSaved(product.id)
                    ? t('wishlist-toggle.button-unsave')
                    : t('wishlist-toggle.button-save')
            }}
        </v-btn>
        <InlineErrorAlert :message="error" data-test="wishlist-toggle-error" />
    </div>
</template>
