import { onMounted, onUnmounted, ref } from 'vue';
import type { Ref } from 'vue';

/*
 * Composable that adds a CSS class once an element enters the viewport.
 * Uses IntersectionObserver — zero layout thrash, performant.
 * @param options - IntersectionObserver options
 * @returns { element, isVisible } — bind element to the target element ref
 */
export function useScrollReveal(options: IntersectionObserverInit = {}) {
    const element: Ref<HTMLElement | undefined> = ref(undefined);
    const isVisible = ref(false);

    let observer: IntersectionObserver | undefined;

    onMounted(() => {
        observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    isVisible.value = true;
                    observer?.disconnect();
                }
            },
            { threshold: 0.12, ...options }
        );
        if (element.value) observer.observe(element.value);
    });

    onUnmounted(() => {
        observer?.disconnect();
    });

    return { el: element, isVisible };
}
