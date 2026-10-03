/**
 * @module
 * A typed provide/inject pair: the example a detail screen shows, plus the one mutation a
 * descendant may ask for, exchanged through a `Symbol` `InjectionKey` rather than a magic string.
 */
import { provide, inject } from 'vue';
import type { InjectionKey, Ref } from 'vue';
import type { Example, ExampleStatus } from '@types';

/**
 * What travels down the tree. The example is read-only to a descendant; changing it goes through
 * the paired mutation, so the one component that owns the request is also the one that toasts and
 * reports a failure.
 */
export interface ProvidedExample {
    /** The example the screen shows, `undefined` while it loads. */
    example: Ref<Example | undefined>;
    /** Asks the provider to move the example to another status. */
    changeStatus: (status: ExampleStatus) => Promise<unknown>;
}

/**
 * A typed key rather than a string. A magic string has to be spelled the same way in two files
 * and nothing checks that it was; an `InjectionKey` carries the value's type, so `inject` needs no
 * annotation and a rename is a compile error on both sides.
 */
export const providedExampleKey: InjectionKey<ProvidedExample> = Symbol('example:provided');

/**
 * Provides the pair to every descendant of the calling component.
 *
 * @param provided - The example and the mutation to hand down.
 */
export const provideExample = (provided: ProvidedExample): void => {
    provide(providedExampleKey, provided);
};

/**
 * Injects the pair. Its one caller only ever renders under a `provideExample()` ancestor, so a
 * missing one is a wiring mistake that fails on the same page load regardless.
 *
 * @returns The provided pair.
 */
export const useProvidedExample = (): ProvidedExample => inject(providedExampleKey)!;
