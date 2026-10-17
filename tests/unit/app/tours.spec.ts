/**
 * @module
 * Guided tours: the catalogue's pure step assembly (order, absent anchors dropped), the guarantee
 * that every step the build contributes names a known tour and has copy in both languages, and
 * `useTour` driving a real driver.js popover in jsdom — opens, records the tour as seen, hands
 * focus back, and has no axe violations.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import axe from 'axe-core';
import { isKnownTour, stepsOfTour, TOURS, visibleSteps } from '@/app/tours/catalogue.ts';
import { isAnchorVisible, useTour } from '@/app/tours/use-tour.ts';
import { collectModuleTours } from '@/kernel/registry';
import type { AppTourStep } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { i18n, loadLocale } from '@/i18n';
import { tourSeenKey, hasSeenTour } from '@/infrastructure/tour-seen.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import { deleteCookie } from '@guebbit/js-toolkit';
import enShell from '@/locales/en.json';
import itShell from '@/locales/it.json';

/** Builds a step with throwaway copy. */
const step = (tour: string, id: string, order?: number): AppTourStep => ({
    tour,
    id,
    target: id,
    title: `${id}.title`,
    body: `${id}.body`,
    order
});

/** Walks a dotted key through a nested dictionary; `undefined` when any part is missing. */
const lookup = (dictionary: unknown, key: string): unknown => {
    let node = dictionary;
    for (const part of key.split('.'))
        node =
            typeof node === 'object' && node !== null
                ? (node as Record<string, unknown>)[part]
                : undefined;
    return node;
};

describe('stepsOfTour', () => {
    it('keeps only the named tour, sorted by order with unordered steps last', () => {
        const steps = [
            step('a', 'late'),
            step('b', 'other', 1),
            step('a', 'second', 20),
            step('a', 'first', 10)
        ];

        expect(stepsOfTour('a', steps).map(({ id }) => id)).toEqual(['first', 'second', 'late']);
    });

    it('is empty for a tour nobody contributed to', () => {
        expect(stepsOfTour('missing', [step('a', 'x')])).toEqual([]);
    });
});

describe('visibleSteps', () => {
    it('drops the steps whose anchor is not on screen, which is how roles differ', () => {
        const steps = [step('t', 'nav-main'), step('t', 'admin-menu'), step('t', 'user-menu')];
        const onScreen = new Set(['nav-main', 'user-menu']);

        expect(visibleSteps(steps, (target) => onScreen.has(target)).map(({ id }) => id)).toEqual([
            'nav-main',
            'user-menu'
        ]);
    });
});

describe('what the build contributes', () => {
    it('only ever names a tour the catalogue knows', () => {
        for (const { tour } of collectModuleTours(enabledModules))
            expect(TOURS).toHaveProperty(tour);
    });

    it('has copy for every module step in English and Italian', async () => {
        for (const locale of ['en', 'it'] as const) {
            const dictionaries = await Promise.all(
                enabledModules.flatMap(({ locales }) =>
                    locales?.[locale] ? [locales[locale]()] : []
                )
            );
            const all = [locale === 'en' ? enShell : itShell, ...dictionaries];
            for (const { title, body } of collectModuleTours(enabledModules))
                for (const key of [title, body])
                    expect(
                        all.some((dictionary) => typeof lookup(dictionary, key) === 'string'),
                        `${locale}: ${key}`
                    ).toBe(true);
        }
    });

    it('has copy for the shell steps, and the same keys in both languages', () => {
        expect(Object.keys(itShell.tours).toSorted()).toEqual(
            Object.keys(enShell.tours).toSorted()
        );
        for (const { title, body } of stepsOfTour('welcome'))
            for (const key of [title, body]) expect(typeof lookup(enShell, key)).toBe('string');
    });

    it('marks only welcome as automatic', () => {
        expect(
            Object.entries(TOURS)
                .filter(([, { auto }]) => auto)
                .map(([id]) => id)
        ).toEqual(['welcome']);
    });
});

/** A page with two of the welcome tour's anchors, one of them hidden. */
const Page = defineComponent({
    render: () =>
        h('div', [
            h('nav', { 'data-tour': 'nav-main', 'aria-label': 'Menu' }, [
                h('a', { href: '/x' }, 'Home')
            ]),
            h('button', { type: 'button', 'data-tour': 'user-menu' }, 'Account'),
            h(
                'button',
                { type: 'button', 'data-tour': 'admin-menu', style: 'display: none' },
                'Admin'
            )
        ])
});

/** Presses Esc and waits for the popover to go: driver.js listens on the document. */
const closeWithEscape = () => {
    document.dispatchEvent(
        new KeyboardEvent('keyup', { key: 'Escape', code: 'Escape', bubbles: true })
    );
    return vi.waitFor(() => expect(document.querySelector('.driver-popover')).toBeNull());
};

/** Mounts a host that runs `useTour` and exposes it. */
const mountTour = () => {
    const host = defineComponent({
        setup: () => useTour(),
        render: () => h(Page)
    });
    return mount(host, { attachTo: document.body, global: { plugins: [i18n] } });
};

beforeEach(async () => {
    setActivePinia(createPinia());
    deleteCookie('toursSeen');
    await loadLocale('en');
});

afterEach(() => {
    document.body.innerHTML = '';
});

describe('isAnchorVisible', () => {
    it('is false for an anchor that is not in the page', () => {
        expect(isAnchorVisible('nowhere')).toBe(false);
    });

    it('is true for an anchor that is', () => {
        const wrapper = mountTour();
        expect(isAnchorVisible('nav-main')).toBe(true);
        wrapper.unmount();
    });
});

describe('useTour', () => {
    it('opens the steps whose anchors exist, records the tour and is accessible', async () => {
        const session = useSessionStore();
        session.viewer = { id: 'acc-1', email: 'a@b.c', role: 'user' };
        const wrapper = mountTour();
        const tour = wrapper.vm;
        const trigger = document.querySelector<HTMLElement>('[data-tour="user-menu"]')!;
        trigger.focus();

        expect(tour.hasSeen('welcome')).toBe(false);
        await expect(tour.startTour('welcome')).resolves.toBe(true);

        expect(document.querySelector('.driver-popover')).not.toBeNull();
        expect(document.body.textContent).toContain('Find your way');
        expect(tour.hasSeen('welcome')).toBe(true);
        expect(hasSeenTour(tourSeenKey('acc-1', 'welcome', TOURS.welcome.version))).toBe(true);

        const results = await axe.run(document.body, { rules: { region: { enabled: false } } });
        expect(results.violations.map(({ id }) => id)).toEqual([]);

        await closeWithEscape();
        wrapper.unmount();
    });

    it('closes on Esc and hands focus back to where it was', async () => {
        const wrapper = mountTour();
        const tour = wrapper.vm;
        const trigger = document.querySelector<HTMLElement>('[data-tour="user-menu"]')!;
        trigger.focus();

        await expect(tour.startTour('welcome')).resolves.toBe(true);
        expect(document.querySelector('.driver-popover')).not.toBeNull();

        await closeWithEscape();
        expect(document.activeElement).toBe(trigger);

        wrapper.unmount();
    });

    it('opens nothing for an unknown tour', async () => {
        const wrapper = mountTour();
        const tour = wrapper.vm;

        expect(isKnownTour('nonsense')).toBe(false);
        await expect(tour.startTour('nonsense')).resolves.toBe(false);
        wrapper.unmount();
    });
});
