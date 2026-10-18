/**
 * @module
 * `useThemeColorMeta` — switching the Vuetify theme rewrites the browser's `theme-color` tags to
 * that theme's surface colour, so a forced theme reaches the address bar.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { createVuetify, useTheme } from 'vuetify';
import type { ThemeInstance } from 'vuetify';
import { useThemeColorMeta } from '@/ui/composables/use-theme-color-meta.ts';
import { dark, light, variations } from '@/ui/vuetify/theme.ts';

/** The theme controller the probe component captured while it was mounted. */
let controller: ThemeInstance | undefined;

/** The probe renders nothing; only its setup matters. */
const renderNothing = () => null;

/** A component that installs the composable and hands its theme controller to the test. */
const Probe = defineComponent({
    setup() {
        useThemeColorMeta();
        controller = useTheme();
        return renderNothing;
    }
});

/** The `content` of every `theme-color` tag on the page. */
const contents = (): (string | null)[] =>
    [...document.querySelectorAll('meta[name="theme-color"]')].map((meta) =>
        meta.getAttribute('content')
    );

/** Mounts the probe under a real Vuetify instance built from the app's theme file. */
const mountProbe = () =>
    mount(Probe, {
        global: {
            plugins: [
                createVuetify({
                    theme: { themes: { light, dark }, variations, defaultTheme: 'light' }
                })
            ]
        }
    });

describe('useThemeColorMeta', () => {
    afterEach(() => {
        document.head.replaceChildren();
        controller = undefined;
    });

    it("writes the active theme's surface into both theme-color tags, then follows a switch", async () => {
        document.head.innerHTML =
            '<meta name="theme-color" media="(prefers-color-scheme: light)" content="#000000">' +
            '<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#000000">';
        const wrapper = mountProbe();
        expect(contents()).toEqual([light.colors.surface, light.colors.surface]);

        await controller?.change('dark');
        await nextTick();
        expect(contents()).toEqual([dark.colors.surface, dark.colors.surface]);
        wrapper.unmount();
    });

    it('does nothing when the page has no theme-color tag', () => {
        const wrapper = mountProbe();
        expect(contents()).toEqual([]);
        wrapper.unmount();
    });
});
