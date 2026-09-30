<script setup lang="ts">
/**
 * @module
 * One product as a shopper sees it in the catalogue grid: picture, name, price, availability, and
 * the storefront buttons other modules contribute (`product-actions` — add to cart, save). No
 * staff controls: edit and delete live in the table staff get instead. The card links to the
 * product page through its title, so the accessible name of the link is the product's own.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { useSlot } from '@/kernel/slots';
import { useSessionStore } from '@/infrastructure/session.ts';
import { formatCurrency } from '@/infrastructure/utils/formatters.ts';
import LazyImage from '@/ui/molecules/LazyImage.vue';
import type { Product } from '@types';

/**
 * The product to show.
 */
const { product } = defineProps<{
    product: Product;
}>();

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Whether a visitor is signed in — a guest is told to sign in instead of being offered buttons.
 */
const { isAuth } = storeToRefs(useSessionStore());

/**
 * The buttons other modules put on a product. This card hosts the same slot the product page
 * does, so it never learns who contributes.
 */
const productActions = useSlot('product-actions');

/**
 * Whether the shelf holds nothing. An absent `available` reads as unconstrained, mirroring the
 * checkout rule.
 */
const outOfStock = computed(() => product.available === 0);
</script>

<template>
    <article
        class="flex h-full flex-col overflow-hidden rounded-xl border"
        data-test="product-card"
    >
        <!-- Decorative: the title link right below already names the product. -->
        <LazyImage
            :src="product.imageUrl"
            :thumbnail-src="product.thumbnailUrl"
            alt=""
            :width="320"
            :height="240"
            rounded="rounded-none"
            style="width: 100%"
        />
        <div class="flex flex-1 flex-col gap-2 p-4">
            <h3 class="text-base font-semibold">
                <RouterLink
                    :to="routerLinkI18n({ name: 'ProductTarget', params: { id: product.id } })"
                    data-test="product-card-link"
                >
                    {{ product.title }}
                </RouterLink>
            </h3>
            <p class="text-lg font-semibold" data-test="product-card-price">
                {{ formatCurrency(product.price, product.currency) }}
            </p>
            <v-chip
                size="small"
                variant="tonal"
                class="self-start"
                :color="outOfStock ? 'error' : 'success'"
                data-test="product-card-availability"
            >
                {{ outOfStock ? t('product-card.out-of-stock') : t('product-card.in-stock') }}
            </v-chip>
            <div class="mt-auto flex flex-wrap items-start gap-2 pt-2">
                <component
                    :is="action"
                    v-for="(action, index) in productActions"
                    :key="index"
                    :product="product"
                />
                <p v-if="!isAuth" class="text-sm opacity-70" data-test="product-card-login">
                    {{ t('product-card.login-to-buy') }}
                </p>
            </div>
        </div>
    </article>
</template>
