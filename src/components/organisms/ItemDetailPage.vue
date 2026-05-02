<template>
    <LayoutDefault :id="pageId" class="item-detail-page" :class="pageClass">
        <template #header>
            <h1 class="theme-page-title">
                <span>{{ pageTitle }}</span>
            </h1>
        </template>

        <section class="item-detail">
            <div class="item-detail__hero-grid">
                <article class="theme-card item-detail__hero animate-on-hover">
                    <div class="item-detail__hero-icon" aria-hidden="true">{{ heroIcon }}</div>
                    <div class="item-detail__hero-copy">
                        <p v-if="heroEyebrow" class="item-detail__eyebrow">{{ heroEyebrow }}</p>
                        <h2 class="item-detail__hero-title">{{ heroTitle }}</h2>
                        <p v-if="heroDescription" class="item-detail__hero-description">
                            {{ heroDescription }}
                        </p>
                    </div>
                    <slot name="hero-extra" />
                </article>

                <div v-if="slots.stats" class="item-detail__stats">
                    <slot name="stats" />
                </div>
            </div>

            <div class="item-detail__body" :class="{ 'with-aside': slots.aside }">
                <article class="theme-card item-detail__panel">
                    <div v-if="sectionTitle || sectionDescription" class="item-detail__section-head">
                        <p v-if="sectionEyebrow" class="item-detail__eyebrow">{{ sectionEyebrow }}</p>
                        <h3 v-if="sectionTitle">{{ sectionTitle }}</h3>
                        <p v-if="sectionDescription">{{ sectionDescription }}</p>
                    </div>

                    <form
                        v-if="editMode"
                        ref="formElement"
                        class="theme-form item-detail__form"
                        @submit.prevent="emit('submit', $event)"
                    >
                        <slot />
                    </form>

                    <div v-else class="item-detail__grid">
                        <slot />
                    </div>
                </article>

                <aside v-if="slots.aside" class="theme-card item-detail__aside">
                    <slot name="aside" />
                </aside>
            </div>

            <div v-if="slots.actions" class="item-detail__actions">
                <slot name="actions" />
            </div>
        </section>
    </LayoutDefault>
</template>

<script setup lang="ts">
import '@/styles/pages/itemDetail.scss';
import { useSlots, useTemplateRef } from 'vue';
import LayoutDefault from '@/layouts/LayoutDefault.vue';

withDefaults(
    defineProps<{
        pageId: string;
        pageTitle: string;
        heroTitle: string;
        pageClass?: string;
        heroEyebrow?: string;
        heroDescription?: string;
        heroIcon?: string;
        sectionEyebrow?: string;
        sectionTitle?: string;
        sectionDescription?: string;
        editMode?: boolean;
    }>(),
    {
        pageClass: '',
        heroEyebrow: undefined,
        heroDescription: undefined,
        heroIcon: '•',
        sectionEyebrow: undefined,
        sectionTitle: undefined,
        sectionDescription: undefined,
        editMode: false
    }
);

const emit = defineEmits<{
    submit: [event: Event];
}>();

const slots = useSlots();
const formElement = useTemplateRef<HTMLFormElement>('formElement');

defineExpose({
    formElement
});
</script>
