/**
 * @module
 * Warns before a half-typed staff form is thrown away. In-app navigation asks through the shared
 * confirm dialog; a tab close or reload gets the browser's own prompt. Silent whenever nothing
 * would be lost: the form is clean, it was just saved, or the session is already over (a forced
 * sign-out is not the visitor's choice to leave).
 */
import { onScopeDispose, ref, watch, type Ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { translate } from '@/i18n';
import { useDialogStore } from '@/ui/dialog.ts';

/**
 * Everything {@link useLeaveGuard} returns.
 */
export interface UseLeaveGuardReturn {
    /**
     * Call on a successful save: the create pages navigate away while the form still reads dirty,
     * and that leave must not ask. Cleared again once the form reads clean.
     */
    markSaved: () => void;
}

/**
 * Guards one form against a leave that would lose typed values.
 *
 * @param isDirty - Whether the form differs from its baseline (`useStructureFormValidation().isDirty`).
 * @param isSignedIn - Whether the viewer is still signed in. The caller reads the session (a design-system
 *  composable must not): once it is over, a leave is forced, not chosen, and never asks.
 * @returns See {@link UseLeaveGuardReturn}.
 */
export const useLeaveGuard = (
    isDirty: Readonly<Ref<boolean>>,
    isSignedIn: () => boolean
): UseLeaveGuardReturn => {
    const dialog = useDialogStore();

    /**
     * Set by {@link UseLeaveGuardReturn.markSaved}; the values are on the server now.
     */
    const saved = ref(false);

    /**
     * Whether leaving now would lose work: typed, unsaved, and the viewer still signed in.
     */
    const holdsWork = () => isDirty.value && !saved.value && isSignedIn();

    watch(isDirty, (dirty) => {
        if (!dirty) saved.value = false;
    });

    // The router's own per-component leave hook: returning false cancels the navigation.
    // https://router.vuejs.org/guide/advanced/navigation-guards.html#In-Component-Guards
    onBeforeRouteLeave(() => {
        if (!holdsWork()) return true;
        return dialog.confirm({
            title: translate('generic.unsaved-changes-title'),
            message: translate('generic.unsaved-changes-message'),
            confirmLabel: translate('generic.unsaved-changes-leave'),
            cancelLabel: translate('generic.unsaved-changes-stay'),
            color: 'warning'
        });
    });

    /**
     * Asks the browser to confirm closing the tab. Browsers show their own text and ignore ours;
     * setting `returnValue` is what makes the prompt appear.
     * https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event
     */
    const warnOnUnload = (event: BeforeUnloadEvent) => {
        if (!holdsWork()) return;
        event.preventDefault();
        // eslint-disable-next-line @typescript-eslint/no-deprecated -- Chromium still shows the prompt only when `returnValue` is set; `preventDefault` alone is not enough there
        event.returnValue = '';
    };

    // Registered while the form is dirty only: a permanent listener keeps the page out of the
    // browser's back/forward cache (Firefox).
    watch(
        () => holdsWork(),
        (holds) => {
            if (holds) globalThis.addEventListener('beforeunload', warnOnUnload);
            else globalThis.removeEventListener('beforeunload', warnOnUnload);
        },
        { immediate: true }
    );
    onScopeDispose(() => globalThis.removeEventListener('beforeunload', warnOnUnload));

    return {
        markSaved: () => {
            saved.value = true;
        }
    };
};
