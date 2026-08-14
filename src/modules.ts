/**
 * THE registry: which domains this build serves.
 *
 * Adding a domain is one folder under `src/modules/` plus one line here. Removing one is `rm -rf`
 * plus deleting its line — and if anything else breaks, that break is real coupling worth seeing
 * rather than a chore worth automating away.
 *
 * Order decides the order route records are spliced into the tree, which vue-router's own ranking
 * makes irrelevant for distinct paths. Keep it alphabetical so diffs stay boring.
 */

import type { AppModule } from '@/kernel/registry';
import account from '@/modules/account/module';
import admin from '@/modules/admin/module';
import cart from '@/modules/cart/module';
import delivery from '@/modules/delivery/module';
import feedback from '@/modules/feedback/module';
import inventory from '@/modules/inventory/module';
import orders from '@/modules/orders/module';
import payments from '@/modules/payments/module';
import products from '@/modules/products/module';
import realtime from '@/modules/realtime/module';
import users from '@/modules/users/module';
import wishlist from '@/modules/wishlist/module';

export const enabledModules: AppModule[] = [
    account,
    admin,
    cart,
    delivery,
    feedback,
    inventory,
    orders,
    payments,
    products,
    realtime,
    users,
    wishlist
];
