/**
 * @module
 * Two helpers around `wrapper.vm` — `@vue/test-utils`'s handle to the mounted component instance
 * — typed through `ComponentPublicInstance` once, here, instead of at every call site.
 *
 * TypeScript-ESLint cannot fully resolve a `.vue` SFC's own instance type in a `VueWrapper`
 * (the `allowComponentTypeUnsafety` lint option would paper over exactly this), so a raw
 * `wrapper.vm.$nextTick()` or `.vm.$emit(...)` is unsafe everywhere it is spelled out directly.
 * The cast happens once, behind a name, the same reasoning as `asStub<T>()`.
 */
import type { ComponentPublicInstance } from 'vue';

/** Anything `@vue/test-utils`' `mount()`/`findComponent()` hands back — only `.vm` is used here. */
interface HasVm {
    vm: unknown;
}

/**
 * Waits for the wrapper's next DOM update.
 *
 * @param wrapper - A mounted or found component wrapper.
 * @returns The same promise `wrapper.vm.$nextTick()` returns.
 */
export const nextRenderTick = (wrapper: HasVm): Promise<void> =>
    (wrapper.vm as ComponentPublicInstance).$nextTick();

/**
 * Emits an event straight off the mounted instance — for a child component's own emit a parent
 * handler is wired to, where triggering the real DOM interaction is not the point of the test.
 *
 * @param wrapper - A mounted or found component wrapper.
 * @param event - The event name a `defineEmits`/`emits` option declares.
 * @param arguments_ - Whatever payload that event carries.
 */
export const emitOn = (wrapper: HasVm, event: string, ...arguments_: unknown[]): void => {
    (wrapper.vm as ComponentPublicInstance).$emit(event, ...arguments_);
};
