---
tags:
  - 2repo
  - 2repo/index
  - project/boilerplate-vue-frontend
type: index
modules: 30
updated: 2026-08-30T17:13:32.814445+00:00
---

# boilerplate-vue-frontend

boilerplate-vue-frontend is a Vue.js e-commerce frontend starter whose application code is organized around domain feature modules—account, cart, orders, payments, products, wishlist, inventory, delivery, and others—under `src/modules/`, with shared concerns separated into `src/infrastructure/`, `src/ui/`, and `src/types/`. The repository pairs this source tree with a structured documentation set (`docs/` covering module guides, API reference, architecture theory, and tooling notes), build and utility `scripts/`, and a multi-layer test suite spanning unit, cross-cutting, and end-to-end tests.

## Module map
```mermaid
flowchart LR
    m_docs["docs/<br/>8 files"]
    m_docs_modules["docs/modules/<br/>18 files"]
    m_docs_reference["docs/reference/<br/>10 files"]
    m_docs_theory["docs/theory/<br/>11 files"]
    m_docs_tools["docs/tools/<br/>20 files"]
    m_public["public/<br/>5 files"]
    m_scripts["scripts/<br/>13 files"]
    m_src_app["src/app/<br/>15 files"]
    m_src_infrastructure["src/infrastructure/<br/>27 files"]
    m_src_modules_account["src/modules/account/<br/>33 files"]
    m_src_modules_admin["src/modules/admin/<br/>12 files"]
    m_src_modules_cart["src/modules/cart/<br/>18 files"]
    m_src_modules_delivery["src/modules/delivery/<br/>7 files"]
    m_src_modules_demo["src/modules/demo/<br/>11 files"]
    m_src_modules_feedback["src/modules/feedback/<br/>11 files"]
    m_src_modules_inventory["src/modules/inventory/<br/>11 files"]
    m_src_modules_locales["src/modules/locales/<br/>19 files"]
    m_src_modules_orders["src/modules/orders/<br/>15 files"]
    m_src_modules_payments["src/modules/payments/<br/>8 files"]
    m_src_modules_products["src/modules/products/<br/>17 files"]
    m_src_modules_realtime["src/modules/realtime/<br/>10 files"]
    m_src_modules_users["src/modules/users/<br/>15 files"]
    m_src_modules_wishlist["src/modules/wishlist/<br/>12 files"]
    m_src_types["src/types/<br/>5 files"]
    m_src_ui["src/ui/<br/>18 files"]
    m_tests_cross_cutting["tests/cross-cutting/<br/>11 files"]
    m_tests_e2e["tests/e2e/<br/>11 files"]
    m_tests_support["tests/support/<br/>13 files"]
    m_tests_unit["tests/unit/<br/>39 files"]
    m_root["/ (repository root)<br/>29 files"]
    m_root --- m_docs
    m_root --- m_docs_modules
    m_root --- m_docs_reference
    m_root --- m_docs_theory
    m_root --- m_docs_tools
    m_root --- m_scripts
    m_root --- m_src_app
    m_root --- m_src_infrastructure
    m_root --- m_src_modules_demo
    m_root --- m_src_modules_locales
    m_root --- m_src_modules_products
    m_root --- m_tests_e2e
    m_root --- m_tests_support
    m_docs --- m_docs_modules
    m_docs --- m_docs_reference
    m_docs --- m_docs_theory
    m_docs --- m_docs_tools
    m_docs --- m_scripts
    m_docs --- m_src_app
    m_docs --- m_src_infrastructure
    m_docs --- m_src_modules_account
    m_docs --- m_src_modules_demo
    m_docs --- m_src_modules_realtime
    m_docs --- m_src_types
    m_docs_reference --- m_docs_theory
    m_docs_reference --- m_scripts
    m_docs_reference --- m_src_infrastructure
    m_docs_reference --- m_tests_support
    m_docs_theory --- m_src_app
    m_docs_theory --- m_src_infrastructure
    m_docs_theory --- m_tests_e2e
    m_docs_tools --- m_scripts
    m_docs_tools --- m_src_app
    m_docs_tools --- m_src_infrastructure
    m_docs_tools --- m_src_modules_account
    m_docs_tools --- m_tests_cross_cutting
    m_docs_tools --- m_tests_e2e
    m_docs_tools --- m_tests_support
    m_docs_tools --- m_tests_unit
    m_scripts --- m_src_infrastructure
    m_scripts --- m_tests_support
    m_src_app --- m_src_infrastructure
    m_src_infrastructure --- m_src_modules_account
    m_src_infrastructure --- m_src_modules_cart
    m_src_infrastructure --- m_src_modules_demo
    m_src_infrastructure --- m_src_modules_feedback
    m_src_infrastructure --- m_src_modules_inventory
    m_src_infrastructure --- m_src_modules_locales
    m_src_infrastructure --- m_src_modules_orders
    m_src_infrastructure --- m_src_modules_payments
    m_src_infrastructure --- m_src_modules_products
    m_src_infrastructure --- m_src_modules_realtime
    m_src_infrastructure --- m_src_modules_users
    m_src_infrastructure --- m_src_modules_wishlist
    m_src_infrastructure --- m_src_types
    m_src_infrastructure --- m_tests_unit
    m_src_modules_account --- m_tests_support
    m_src_modules_admin --- m_tests_support
    m_src_modules_cart --- m_tests_support
    m_src_modules_demo --- m_tests_support
    m_src_modules_feedback --- m_tests_support
    m_src_modules_inventory --- m_tests_support
    m_src_modules_locales --- m_tests_support
    m_src_modules_orders --- m_tests_support
    m_src_modules_products --- m_tests_support
    m_src_modules_realtime --- m_tests_support
    m_src_modules_users --- m_tests_support
    m_src_modules_wishlist --- m_tests_support
    m_tests_e2e --- m_tests_support
    m_tests_support --- m_tests_unit
```

_16 lower-traffic connection(s) hidden to keep the diagram readable._

## Modules
- [[boilerplate-vue-frontend_docs|docs/]] — 8 files, 12 connected modules
- [[boilerplate-vue-frontend_docs_modules|docs/modules/]] — 18 files, 4 connected modules
- [[boilerplate-vue-frontend_docs_reference|docs/reference/]] — 10 files, 9 connected modules
- [[boilerplate-vue-frontend_docs_theory|docs/theory/]] — 11 files, 9 connected modules
- [[boilerplate-vue-frontend_docs_tools|docs/tools/]] — 20 files, 11 connected modules
- [[boilerplate-vue-frontend_public|public/]] — 5 files, 0 connected modules
- [[boilerplate-vue-frontend_scripts|scripts/]] — 13 files, 9 connected modules
- [[boilerplate-vue-frontend_src_app|src/app/]] — 15 files, 7 connected modules
- [[boilerplate-vue-frontend_src_infrastructure|src/infrastructure/]] — 27 files, 21 connected modules
- [[boilerplate-vue-frontend_src_modules_account|src/modules/account/]] — 33 files, 4 connected modules
- [[boilerplate-vue-frontend_src_modules_admin|src/modules/admin/]] — 12 files, 3 connected modules
- [[boilerplate-vue-frontend_src_modules_cart|src/modules/cart/]] — 18 files, 3 connected modules
- [[boilerplate-vue-frontend_src_modules_delivery|src/modules/delivery/]] — 7 files, 0 connected modules
- [[boilerplate-vue-frontend_src_modules_demo|src/modules/demo/]] — 11 files, 4 connected modules
- [[boilerplate-vue-frontend_src_modules_feedback|src/modules/feedback/]] — 11 files, 2 connected modules
- [[boilerplate-vue-frontend_src_modules_inventory|src/modules/inventory/]] — 11 files, 2 connected modules
- [[boilerplate-vue-frontend_src_modules_locales|src/modules/locales/]] — 19 files, 5 connected modules
- [[boilerplate-vue-frontend_src_modules_orders|src/modules/orders/]] — 15 files, 2 connected modules
- [[boilerplate-vue-frontend_src_modules_payments|src/modules/payments/]] — 8 files, 1 connected module
- [[boilerplate-vue-frontend_src_modules_products|src/modules/products/]] — 17 files, 4 connected modules
- [[boilerplate-vue-frontend_src_modules_realtime|src/modules/realtime/]] — 10 files, 3 connected modules
- [[boilerplate-vue-frontend_src_modules_users|src/modules/users/]] — 15 files, 2 connected modules
- [[boilerplate-vue-frontend_src_modules_wishlist|src/modules/wishlist/]] — 12 files, 2 connected modules
- [[boilerplate-vue-frontend_src_types|src/types/]] — 5 files, 3 connected modules
- [[boilerplate-vue-frontend_src_ui|src/ui/]] — 18 files, 2 connected modules
- [[boilerplate-vue-frontend_tests_cross-cutting|tests/cross-cutting/]] — 11 files, 5 connected modules
- [[boilerplate-vue-frontend_tests_e2e|tests/e2e/]] — 11 files, 6 connected modules
- [[boilerplate-vue-frontend_tests_support|tests/support/]] — 13 files, 18 connected modules
- [[boilerplate-vue-frontend_tests_unit|tests/unit/]] — 39 files, 6 connected modules
- [[boilerplate-vue-frontend_ROOT|/ (repository root)]] — 29 files, 13 connected modules
