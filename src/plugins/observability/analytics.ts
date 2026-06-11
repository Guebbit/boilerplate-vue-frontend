/**
 * Analytics module
 *
 * Thin abstraction over the analytics provider (PostHog).
 * Centralizes all event names and ensures consistent
 * tracking across the application.
 */

import { captureEvent } from './posthog.ts';

// ──────────────────────────────────────────────
// Event catalog
// ──────────────────────────────────────────────

export const AnalyticsEvents = {
  // Application Lifecycle
  APP_STARTED: 'app_started',
  APP_READY: 'app_ready',

  // Navigation
  PAGE_VIEW: 'page_view',

  // Authentication
  USER_SIGNED_UP: 'user_signed_up',
  USER_LOGGED_IN: 'user_logged_in',
  USER_LOGGED_OUT: 'user_logged_out',

  // Cart
  ITEM_ADDED_TO_CART: 'item_added_to_cart',
  ITEM_REMOVED_FROM_CART: 'item_removed_from_cart',
  CART_CLEARED: 'cart_cleared',

  // Orders
  ORDER_CHECKOUT_STARTED: 'order_checkout_started',
  CHECKOUT_COMPLETED: 'checkout_completed',
  ORDER_PLACED: 'order_placed',

  // Products
  PRODUCT_VIEWED: 'product_viewed',
  PRODUCT_SEARCHED: 'product_searched',

  // Feedback
  FEEDBACK_SUBMITTED: 'feedback_submitted',
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

// ──────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────

/**
 * Track any analytics event.
 *
 * @param event - One of the named events in AnalyticsEvents.
 * @param properties - Optional custom properties attached to the event.
 */
export function track(
  event: AnalyticsEventName,
  properties?: Record<string, unknown>,
): void {
  captureEvent(event, properties);
}

/**
 * Convenience helper for tracking product views.
 */
export function trackProductView(productId: string, productName?: string): void {
  track(AnalyticsEvents.PRODUCT_VIEWED, {
    product_id: productId,
    product_name: productName,
  });
}

/**
 * Convenience helper for tracking cart additions.
 */
export function trackItemAddedToCart(productId: string, quantity: number): void {
  track(AnalyticsEvents.ITEM_ADDED_TO_CART, {
    product_id: productId,
    quantity,
  });
}

/**
 * Convenience helper for tracking order placement.
 */
export function trackOrderPlaced(orderId: string, totalAmount: number, itemCount: number): void {
  track(AnalyticsEvents.ORDER_PLACED, {
    order_id: orderId,
    total_amount: totalAmount,
    item_count: itemCount,
  });
}

/**
 * Convenience helper for tracking product searches.
 */
export function trackProductSearched(query: string): void {
  track(AnalyticsEvents.PRODUCT_SEARCHED, {
    query,
  });
}
