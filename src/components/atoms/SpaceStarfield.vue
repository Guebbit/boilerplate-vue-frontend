<template>
    <div class="starfield" aria-hidden="true">
        <!-- Three depth layers — different densities, sizes and drift speeds -->
        <div class="starfield-layer starfield-layer-far" :style="{ backgroundImage: farStars }" />
        <div class="starfield-layer starfield-layer-mid" :style="{ backgroundImage: midStars }" />
        <div class="starfield-layer starfield-layer-near" :style="{ backgroundImage: nearStars }" />
        <!-- Volumetric nebula lighting -->
        <div class="starfield-nebula" />
    </div>
</template>

<style scoped>
.starfield {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
}

/*
 * Each layer is a repeating tile of radial-gradient "stars".
 * Layers are oversized and drift with pure transforms — GPU only, no layout.
 */
.starfield-layer {
    position: absolute;
    inset: -50% 0 0 0;
    height: 200%;
    background-repeat: repeat;
    will-change: transform;
}

.starfield-layer-far {
    background-size: 480px 480px;
    opacity: 0.7;
    animation: starDrift 240s linear infinite;
}

.starfield-layer-mid {
    background-size: 340px 340px;
    opacity: 0.8;
    animation: starDrift 150s linear infinite;
}

.starfield-layer-near {
    background-size: 260px 260px;
    animation: starDrift 90s linear infinite;
}

@keyframes starDrift {
    from {
        transform: translateY(0);
    }
    to {
        transform: translateY(50%);
    }
}

/* Soft volumetric nebula glow — two large light fields breathing slowly */
.starfield-nebula {
    position: absolute;
    inset: 0;
    background:
        radial-gradient(ellipse 60% 40% at 18% 25%, rgba(115, 143, 255, 0.13), transparent 65%),
        radial-gradient(ellipse 55% 45% at 82% 70%, rgba(187, 134, 252, 0.1), transparent 65%),
        radial-gradient(ellipse 40% 30% at 55% 45%, rgba(77, 208, 225, 0.06), transparent 70%);
    animation: nebulaBreath 26s ease-in-out infinite alternate;
}

@keyframes nebulaBreath {
    from {
        opacity: 0.75;
        transform: scale(1);
    }
    to {
        opacity: 1;
        transform: scale(1.06);
    }
}

@media (prefers-reduced-motion: reduce) {
    .starfield-layer,
    .starfield-nebula {
        animation: none;
    }
}
</style>

<script lang="ts">
export default { name: 'SpaceStarfield' };
</script>

<script setup lang="ts">
import { computed } from 'vue';

/*
 * Deterministic pseudo-random generator (Park–Miller LCG).
 * Same seed = same sky on every render — zero hydration/layout shift.
 * @param seed - positive integer seed
 * @returns function producing floats in [0, 1)
 */
function seededRandom(seed: number) {
    let state = seed % 2_147_483_647;
    if (state <= 0) state += 2_147_483_646;
    return () => {
        state = (state * 16_807) % 2_147_483_647;
        return (state - 1) / 2_147_483_646;
    };
}

/*
 * Builds a CSS background-image string of tiny radial-gradient stars.
 * @param seed - deterministic seed per layer
 * @param count - stars per tile
 * @param maxSize - max star radius in px
 * @returns comma-joined radial-gradient list
 */
function buildStars(seed: number, count: number, maxSize: number): string {
    const rand = seededRandom(seed);
    const stars: string[] = [];
    for (let i = 0; i < count; i++) {
        const x = (rand() * 100).toFixed(1);
        const y = (rand() * 100).toFixed(1);
        const size = (0.5 + rand() * maxSize).toFixed(1);
        const alpha = (0.35 + rand() * 0.65).toFixed(2);
        stars.push(
            `radial-gradient(${size}px ${size}px at ${x}% ${y}%, rgba(255,255,255,${alpha}), transparent 100%)`
        );
    }
    return stars.join(',');
}

const farStars = computed(() => buildStars(7, 34, 0.8));
const midStars = computed(() => buildStars(21, 24, 1.1));
const nearStars = computed(() => buildStars(42, 14, 1.6));
</script>
