<template>
    <section id="home-hero" class="hero-section">
        <!-- Gradient backdrop -->
        <div class="hero-bg" aria-hidden="true" />

        <!-- Drifting aurora blobs -->
        <div class="hero-aurora hero-aurora-1" aria-hidden="true" />
        <div class="hero-aurora hero-aurora-2" aria-hidden="true" />
        <div class="hero-aurora hero-aurora-3" aria-hidden="true" />

        <VContainer max-width="1280" class="hero-container">
            <VRow align="center" justify="space-between" class="py-8 py-md-16">
                <!-- Text column -->
                <VCol cols="12" md="7" lg="6" class="hero-text-col">
                    <div class="hero-eyebrow hero-enter hero-enter-1 mb-3">
                        <VChip
                            color="primary"
                            variant="tonal"
                            size="small"
                            class="font-weight-bold text-uppercase"
                        >
                            {{ t('home-page.hero-eyebrow') }}
                        </VChip>
                    </div>

                    <h1
                        class="hero-title hero-enter hero-enter-2 text-h3 text-md-h2 font-weight-black mb-5"
                    >
                        {{ t('home-page.hero-title') }}
                    </h1>

                    <p
                        class="hero-description hero-enter hero-enter-3 text-body-1 text-md-h6 font-weight-regular mb-8"
                        style="line-height: 1.7"
                    >
                        {{ t('home-page.hero-description') }}
                    </p>

                    <div class="hero-ctas hero-enter hero-enter-4 d-flex flex-wrap ga-4">
                        <VBtn
                            color="primary"
                            size="large"
                            rounded="xl"
                            elevation="4"
                            append-icon="$arrowRight"
                            @click="$emit('scrollTo', 'home-contact')"
                        >
                            {{ t('home-page.hero-cta-primary') }}
                        </VBtn>
                        <VBtn
                            variant="outlined"
                            color="primary"
                            size="large"
                            rounded="xl"
                            append-icon="$chevronDown"
                            @click="$emit('scrollTo', 'home-services')"
                        >
                            {{ t('home-page.hero-cta-secondary') }}
                        </VBtn>
                    </div>
                </VCol>

                <!-- Profile image column -->
                <VCol
                    cols="12"
                    md="5"
                    lg="5"
                    class="d-flex justify-center justify-md-end mt-10 mt-md-0"
                >
                    <div class="hero-avatar-wrapper hero-enter hero-enter-3">
                        <img
                            :src="PUBLIC_PATH + 'images/placeholder-profile.svg'"
                            :alt="t('home-page.hero-placeholder-alt')"
                            class="hero-avatar"
                            width="340"
                            height="340"
                        />
                        <!-- Decorative rings -->
                        <div class="hero-ring hero-ring-1" aria-hidden="true" />
                        <div class="hero-ring hero-ring-2" aria-hidden="true" />
                        <!-- Rotating conic glow ring -->
                        <div class="hero-orbit" aria-hidden="true" />
                        <!-- Orbiting sparkles -->
                        <span class="hero-spark hero-spark-1" aria-hidden="true" />
                        <span class="hero-spark hero-spark-2" aria-hidden="true" />
                        <span class="hero-spark hero-spark-3" aria-hidden="true" />
                    </div>
                </VCol>
            </VRow>
        </VContainer>

        <!-- Scroll cue -->
        <button
            class="hero-scroll-cue"
            type="button"
            :aria-label="t('home-page.hero-cta-secondary')"
            @click="$emit('scrollTo', 'home-about')"
        >
            <VIcon icon="$chevronDown" size="28" />
        </button>
    </section>
</template>

<style scoped>
.hero-section {
    position: relative;
    overflow: hidden;
    min-height: 88vh;
    display: flex;
    align-items: center;
}

.hero-bg {
    position: absolute;
    inset: 0;
    background: linear-gradient(
        135deg,
        rgb(var(--v-theme-primary), 0.06) 0%,
        rgb(var(--v-theme-secondary), 0.04) 60%,
        transparent 100%
    );
    pointer-events: none;
}

/* Subtle mesh dots pattern */
.hero-bg::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: radial-gradient(rgb(var(--v-theme-primary), 0.07) 1px, transparent 1px);
    background-size: 28px 28px;
    mask-image: radial-gradient(ellipse at 30% 40%, black 30%, transparent 75%);
}

/* Drifting aurora blobs — soft blurred color fields */
.hero-aurora {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.35;
    pointer-events: none;
    animation: heroAurora 18s ease-in-out infinite alternate;
}

.hero-aurora-1 {
    width: 480px;
    height: 480px;
    top: -120px;
    left: -100px;
    background: radial-gradient(circle, rgb(var(--v-theme-primary), 0.5), transparent 70%);
}

.hero-aurora-2 {
    width: 420px;
    height: 420px;
    bottom: -140px;
    right: -80px;
    background: radial-gradient(circle, rgb(var(--v-theme-secondary), 0.45), transparent 70%);
    animation-delay: -6s;
    animation-duration: 22s;
}

.hero-aurora-3 {
    width: 320px;
    height: 320px;
    top: 40%;
    left: 45%;
    background: radial-gradient(circle, rgb(var(--v-theme-info), 0.3), transparent 70%);
    animation-delay: -12s;
    animation-duration: 26s;
}

@keyframes heroAurora {
    0% {
        transform: translate(0, 0) scale(1);
    }
    50% {
        transform: translate(60px, -40px) scale(1.15);
    }
    100% {
        transform: translate(-40px, 50px) scale(0.95);
    }
}

.hero-container {
    position: relative;
    z-index: 1;
}

/* Animated shimmering gradient title */
.hero-title {
    background: linear-gradient(
        110deg,
        rgb(var(--v-theme-primary)) 0%,
        rgb(var(--v-theme-secondary)) 35%,
        rgb(var(--v-theme-info)) 55%,
        rgb(var(--v-theme-primary)) 100%
    );
    background-size: 220% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 1.15 !important;
    animation: heroShimmer 7s linear infinite;
}

@keyframes heroShimmer {
    to {
        background-position: 220% center;
    }
}

/* Staggered entrance for text column */
.hero-enter {
    opacity: 0;
    transform: translateY(28px);
    animation: heroEnter 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.hero-enter-1 {
    animation-delay: 0.1s;
}

.hero-enter-2 {
    animation-delay: 0.25s;
}

.hero-enter-3 {
    animation-delay: 0.4s;
}

.hero-enter-4 {
    animation-delay: 0.55s;
}

@keyframes heroEnter {
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.hero-avatar-wrapper {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.hero-avatar {
    border-radius: 50%;
    object-fit: cover;
    position: relative;
    z-index: 1;
    box-shadow: 0 24px 64px rgb(var(--v-theme-primary), 0.25);
    animation: heroFloat 6s ease-in-out infinite;
}

.hero-ring {
    position: absolute;
    border-radius: 50%;
    border: 2px solid;
    opacity: 0.18;
    animation: heroRing 6s ease-in-out infinite;
}

.hero-ring-1 {
    inset: -18px;
    border-color: rgb(var(--v-theme-primary));
    animation-delay: 0s;
}

.hero-ring-2 {
    inset: -40px;
    border-color: rgb(var(--v-theme-secondary));
    animation-delay: 1.5s;
}

/* Rotating conic gradient halo behind the avatar */
.hero-orbit {
    position: absolute;
    inset: -28px;
    border-radius: 50%;
    background: conic-gradient(
        from 0deg,
        transparent 0%,
        rgb(var(--v-theme-primary), 0.5) 12%,
        transparent 28%,
        rgb(var(--v-theme-secondary), 0.45) 55%,
        transparent 72%,
        rgb(var(--v-theme-info), 0.4) 88%,
        transparent 100%
    );
    filter: blur(14px);
    animation: heroOrbit 12s linear infinite;
}

@keyframes heroOrbit {
    to {
        transform: rotate(360deg);
    }
}

/* Sparkles orbiting the avatar */
.hero-spark {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 10px;
    height: 10px;
    margin: -5px;
    border-radius: 50%;
    z-index: 2;
    animation: heroSparkOrbit 10s linear infinite;
}

.hero-spark::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    animation: heroSparkPulse 2s ease-in-out infinite;
}

.hero-spark-1::before {
    background: rgb(var(--v-theme-primary));
    box-shadow: 0 0 14px rgb(var(--v-theme-primary));
}

.hero-spark-2 {
    animation-delay: -3.3s;
    animation-duration: 13s;
}

.hero-spark-2::before {
    background: rgb(var(--v-theme-secondary));
    box-shadow: 0 0 14px rgb(var(--v-theme-secondary));
    animation-delay: -0.7s;
}

.hero-spark-3 {
    animation-delay: -6.6s;
    animation-duration: 16s;
    width: 7px;
    height: 7px;
}

.hero-spark-3::before {
    background: rgb(var(--v-theme-info));
    box-shadow: 0 0 12px rgb(var(--v-theme-info));
    animation-delay: -1.4s;
}

@keyframes heroSparkOrbit {
    from {
        transform: rotate(0deg) translateX(205px) rotate(0deg);
    }
    to {
        transform: rotate(360deg) translateX(205px) rotate(-360deg);
    }
}

@keyframes heroSparkPulse {
    0%,
    100% {
        transform: scale(1);
        opacity: 0.9;
    }
    50% {
        transform: scale(1.6);
        opacity: 0.5;
    }
}

/* Bouncing scroll cue */
.hero-scroll-cue {
    position: absolute;
    left: 50%;
    bottom: 24px;
    transform: translateX(-50%);
    z-index: 2;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    color: rgb(var(--v-theme-primary));
    border: 1px solid rgb(var(--v-theme-primary), 0.3);
    background: rgb(var(--v-theme-surface), 0.6);
    backdrop-filter: blur(6px);
    cursor: pointer;
    animation: heroCueBounce 2.2s ease-in-out infinite;
    transition: border-color 0.3s ease;
}

.hero-scroll-cue:hover {
    border-color: rgb(var(--v-theme-primary));
}

@keyframes heroCueBounce {
    0%,
    100% {
        transform: translateX(-50%) translateY(0);
    }
    50% {
        transform: translateX(-50%) translateY(10px);
    }
}

@keyframes heroFloat {
    0%,
    100% {
        transform: translateY(0);
    }
    50% {
        transform: translateY(-12px);
    }
}

@keyframes heroRing {
    0%,
    100% {
        transform: scale(1);
        opacity: 0.18;
    }
    50% {
        transform: scale(1.04);
        opacity: 0.28;
    }
}

/* Respect users who prefer less motion */
@media (prefers-reduced-motion: reduce) {
    .hero-aurora,
    .hero-title,
    .hero-avatar,
    .hero-ring,
    .hero-orbit,
    .hero-spark,
    .hero-spark::before,
    .hero-scroll-cue {
        animation: none;
    }

    .hero-enter {
        animation: none;
        opacity: 1;
        transform: none;
    }
}
</style>

<script lang="ts">
export default { name: 'HomeHero' };
</script>

<script setup lang="ts">
import { VBtn, VChip, VCol, VContainer, VIcon, VRow } from 'vuetify/components';
import { useI18n } from 'vue-i18n';
import { PUBLIC_PATH } from '@/utils/constants';

const { t } = useI18n();

/*
 * @emits scrollTo - section element id to scroll to (use @scroll-to in templates)
 */
defineEmits<{ scrollTo: [id: string] }>();
</script>
