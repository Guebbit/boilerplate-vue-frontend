/**
 * @module
 * Extension points: a module OWNS a slot (a place in one of its views) and any number of other
 * modules CONTRIBUTE components to it through their manifest's `slots` field. The owner reads
 * `useSlot(name)` and renders whatever arrived, so it never imports its contributors — the
 * dependency runs contributor → owner, which is what lets the product page offer "add to cart"
 * without `products` knowing the cart exists.
 *
 * The composition root collects every enabled module's contributions once
 * (`collectModuleSlots`) and provides them under {@link SLOTS_KEY}; the kernel stays ignorant of
 * Pinia and of what a slot's component does. A slot only earns a name here when a second module
 * needs one — see `docs/theory/layers.md`.
 */
import { inject } from 'vue';
import type { Component, InjectionKey } from 'vue';

/**
 * Every slot a module can contribute to, by name. Each slot's owner documents the props its
 * components receive.
 *
 * - `product-actions`: the storefront buttons on the product page; receives `{ product }`.
 * - `product-create-extras`: the product create form, beside its fields; receives
 *   `{ registerAfterCreate }`, a function taking a step to run with the new product's id once it
 *   exists. Stock is not a product field, so `inventory` puts its opening-stock field here.
 * - `app-bar`: the shell's app bar, beside the account menu; receives nothing. A contribution
 *   owns its own visibility, because it is mounted for guests too.
 * - `payments-awaiting-transfer`: the "Awaiting transfer" tab of the payments page; receives
 *   nothing. That tab reads ORDERS (no payment exists until the money is recorded), so `orders`
 *   fills it and `payments` never imports it.
 */
export type SlotName =
    'product-actions' | 'product-create-extras' | 'app-bar' | 'payments-awaiting-transfer';

/**
 * The collected contributions: slot name to the components every enabled module put there, in
 * module order.
 */
export type Slots = Partial<Record<SlotName, Component[]>>;

/**
 * The injection key the composition root provides the collected {@link Slots} under.
 */
export const SLOTS_KEY: InjectionKey<Slots> = Symbol('module-slots');

/**
 * The components contributed to one slot.
 *
 * @param name - The slot the calling view owns.
 * @returns Its contributions, empty when nothing is provided or no module contributes.
 */
export const useSlot = (name: SlotName): Component[] => inject(SLOTS_KEY, {})[name] ?? [];
