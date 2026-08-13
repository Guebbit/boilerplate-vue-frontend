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

import type { IAppModule } from '@/kernel/registry';
import account from '@/modules/account/module';
import admin from '@/modules/admin/module';
import cart from '@/modules/cart/module';
import feedback from '@/modules/feedback/module';
import orders from '@/modules/orders/module';
import products from '@/modules/products/module';
import realtime from '@/modules/realtime/module';
import users from '@/modules/users/module';
import wishlist from '@/modules/wishlist/module';

export const enabledModules: IAppModule[] = [
    account,
    admin,
    cart,
    feedback,
    orders,
    products,
    realtime,
    users,
    wishlist
];
