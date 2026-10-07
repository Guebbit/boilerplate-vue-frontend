<script setup lang="ts">
/**
 * @module
 * The cart route's screen: tells a guest from a signed-in visitor and renders the cart that is
 * theirs. A signed-in cart has shipping, addresses, payment and checkout, all of which need an
 * account; a guest's is a plain list kept in the browser, so the two are separate screens
 * behind one address.
 */
import { storeToRefs } from 'pinia';
import { useSessionStore } from '@/infrastructure/session.ts';
import Cart from './Cart.vue';
import GuestCart from '../components/GuestCart.vue';

/**
 * Whether anyone is signed in: the one fact that decides which cart to show.
 */
const { isAuth } = storeToRefs(useSessionStore());
</script>

<template>
    <Cart v-if="isAuth" />
    <GuestCart v-else />
</template>
