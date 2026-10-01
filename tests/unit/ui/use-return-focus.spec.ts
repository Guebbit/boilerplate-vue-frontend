/**
 * @module
 * `useReturnFocus` — a dialog with no activator hands focus back to the control that opened it,
 * and only when there is such a control still on the page.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { useReturnFocus } from '@/ui/composables/use-return-focus.ts';

/** Adds a focusable button to the page and focuses it. */
const focusedButton = (): HTMLButtonElement => {
    const button = document.createElement('button');
    document.body.append(button);
    button.focus();
    return button;
};

/** Lets the composable's watcher and its `nextTick` hand-back both run. */
const settle = () => nextTick().then(() => nextTick());

describe('useReturnFocus', () => {
    afterEach(() => {
        document.body.replaceChildren();
    });

    it('puts focus back on the opener when the dialog closes', async () => {
        const open = ref(false);
        effectScope().run(() => {
            useReturnFocus(() => open.value);
        });
        const opener = focusedButton();

        open.value = true;
        await settle();
        // Stand-in for Vuetify moving focus into the dialog.
        document.body.focus();
        open.value = false;
        await settle();

        expect(document.activeElement).toBe(opener);
    });

    it('leaves focus alone when the opener has left the page', async () => {
        const open = ref(false);
        effectScope().run(() => {
            useReturnFocus(() => open.value);
        });
        const opener = focusedButton();

        open.value = true;
        await settle();
        opener.remove();
        open.value = false;
        await settle();

        expect(document.activeElement).toBe(document.body);
    });

    it('has nothing to hand back when nothing held focus on open', async () => {
        const open = ref(false);
        effectScope().run(() => {
            useReturnFocus(() => open.value);
        });
        const bystander = document.createElement('button');
        document.body.append(bystander);

        open.value = true;
        await settle();
        open.value = false;
        await settle();

        expect(document.activeElement).toBe(document.body);
    });
});
