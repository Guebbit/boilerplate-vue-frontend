---
tags:
  - 2repo
  - 2repo/index
  - project/boilerplate-vue-frontend
type: index
modules: 30
updated: 2026-09-03T11:01:27.485763+00:00
---

# boilerplate-vue-frontend

`boilerplate-vue-frontend` is a Vue.js frontend boilerplate structured around an e-commerce domain, providing a ready-made foundation for features such as cart, orders, payments, products, inventory, and user accounts. Its source follows a layered layout: `src/app/`, `src/infrastructure/`, `src/ui/`, and `src/types/` hold cross-cutting concerns, while each business feature is isolated as a self-contained directory under `src/modules/`. Supporting material lives in `docs/` (split into api, modules, reference, theory, and tools guides) and `tests/` (unit, e2e, and cross-cutting suites), with build automation in `scripts/` and static assets in `public/`.

## Module map
```mermaid
flowchart LR
    m_docs_api["docs/api/<br/>5 files"]
    m_docs_modules["docs/modules/<br/>18 files"]
    m_docs_reference["docs/reference/<br/>10 files"]
    m_docs_theory["docs/theory/<br/>12 files"]
    m_docs_tools["docs/tools/<br/>24 files"]
    m_public["public/<br/>5 files"]
    m_scripts["scripts/<br/>13 files"]
    m_src_app["src/app/<br/>21 files"]
    m_src_infrastructure["src/infrastructure/<br/>21 files"]
    m_src_modules_account["src/modules/account/<br/>37 files"]
    m_src_modules_admin["src/modules/admin/<br/>12 files"]
    m_src_modules_cart["src/modules/cart/<br/>21 files"]
    m_src_modules_delivery["src/modules/delivery/<br/>7 files"]
    m_src_modules_demo["src/modules/demo/<br/>11 files"]
    m_src_modules_feedback["src/modules/feedback/<br/>11 files"]
    m_src_modules_inventory["src/modules/inventory/<br/>13 files"]
    m_src_modules_locales["src/modules/locales/<br/>21 files"]
    m_src_modules_orders["src/modules/orders/<br/>17 files"]
    m_src_modules_payments["src/modules/payments/<br/>8 files"]
    m_src_modules_products["src/modules/products/<br/>17 files"]
    m_src_modules_realtime["src/modules/realtime/<br/>10 files"]
    m_src_modules_users["src/modules/users/<br/>15 files"]
    m_src_modules_wishlist["src/modules/wishlist/<br/>12 files"]
    m_src_types["src/types/<br/>5 files"]
    m_src_ui["src/ui/<br/>22 files"]
    m_tests_cross_cutting["tests/cross-cutting/<br/>11 files"]
    m_tests_e2e["tests/e2e/<br/>10 files"]
    m_tests_support["tests/support/<br/>13 files"]
    m_tests_unit["tests/unit/<br/>38 files"]
    m_root["/ (repository root)<br/>33 files"]
    m_root --- m_docs_api
    m_root --- m_docs_reference
    m_root --- m_docs_theory
    m_root --- m_docs_tools
    m_root --- m_scripts
    m_root --- m_src_infrastructure
    m_root --- m_src_modules_locales
    m_root --- m_src_modules_products
    m_root --- m_tests_support
    m_docs_api --- m_docs_modules
    m_docs_api --- m_docs_reference
    m_docs_api --- m_docs_theory
    m_docs_api --- m_docs_tools
    m_docs_modules --- m_docs_reference
    m_docs_modules --- m_docs_theory
    m_docs_modules --- m_docs_tools
    m_docs_reference --- m_docs_theory
    m_docs_reference --- m_docs_tools
    m_docs_theory --- m_docs_tools
    m_scripts --- m_src_modules_locales
    m_scripts --- m_tests_unit
    m_src_infrastructure --- m_src_modules_account
    m_src_infrastructure --- m_src_modules_cart
    m_src_infrastructure --- m_src_modules_demo
    m_src_infrastructure --- m_src_modules_feedback
    m_src_infrastructure --- m_src_modules_inventory
    m_src_infrastructure --- m_src_modules_locales
    m_src_infrastructure --- m_src_modules_orders
    m_src_infrastructure --- m_src_modules_payments
    m_src_infrastructure --- m_src_modules_products
    m_src_infrastructure --- m_src_modules_users
    m_src_infrastructure --- m_src_modules_wishlist
    m_src_modules_account --- m_tests_support
    m_src_modules_admin --- m_tests_support
    m_src_modules_cart --- m_tests_support
    m_src_modules_cart --- m_tests_unit
    m_src_modules_demo --- m_tests_support
    m_src_modules_feedback --- m_tests_support
    m_src_modules_inventory --- m_tests_support
    m_src_modules_locales --- m_tests_cross_cutting
    m_src_modules_locales --- m_tests_support
    m_src_modules_orders --- m_tests_support
    m_src_modules_products --- m_tests_support
    m_src_modules_realtime --- m_tests_support
    m_src_modules_users --- m_tests_support
    m_src_modules_wishlist --- m_tests_support
    m_tests_cross_cutting --- m_tests_unit
    m_tests_e2e --- m_tests_support
    m_tests_support --- m_tests_unit
```

## Modules
- [[boilerplate-vue-frontend_docs_api|docs/api/]] — 5 files, 5 connected modules
- [[boilerplate-vue-frontend_docs_modules|docs/modules/]] — 18 files, 4 connected modules
- [[boilerplate-vue-frontend_docs_reference|docs/reference/]] — 10 files, 5 connected modules
- [[boilerplate-vue-frontend_docs_theory|docs/theory/]] — 12 files, 5 connected modules
- [[boilerplate-vue-frontend_docs_tools|docs/tools/]] — 24 files, 5 connected modules
- [[boilerplate-vue-frontend_public|public/]] — 5 files, 0 connected modules
- [[boilerplate-vue-frontend_scripts|scripts/]] — 13 files, 3 connected modules
- [[boilerplate-vue-frontend_src_app|src/app/]] — 21 files, 0 connected modules
- [[boilerplate-vue-frontend_src_infrastructure|src/infrastructure/]] — 21 files, 12 connected modules
- [[boilerplate-vue-frontend_src_modules_account|src/modules/account/]] — 37 files, 2 connected modules
- [[boilerplate-vue-frontend_src_modules_admin|src/modules/admin/]] — 12 files, 1 connected module
- [[boilerplate-vue-frontend_src_modules_cart|src/modules/cart/]] — 21 files, 3 connected modules
- [[boilerplate-vue-frontend_src_modules_delivery|src/modules/delivery/]] — 7 files, 0 connected modules
- [[boilerplate-vue-frontend_src_modules_demo|src/modules/demo/]] — 11 files, 2 connected modules
- [[boilerplate-vue-frontend_src_modules_feedback|src/modules/feedback/]] — 11 files, 2 connected modules
- [[boilerplate-vue-frontend_src_modules_inventory|src/modules/inventory/]] — 13 files, 2 connected modules
- [[boilerplate-vue-frontend_src_modules_locales|src/modules/locales/]] — 21 files, 5 connected modules
- [[boilerplate-vue-frontend_src_modules_orders|src/modules/orders/]] — 17 files, 2 connected modules
- [[boilerplate-vue-frontend_src_modules_payments|src/modules/payments/]] — 8 files, 1 connected module
- [[boilerplate-vue-frontend_src_modules_products|src/modules/products/]] — 17 files, 3 connected modules
- [[boilerplate-vue-frontend_src_modules_realtime|src/modules/realtime/]] — 10 files, 1 connected module
- [[boilerplate-vue-frontend_src_modules_users|src/modules/users/]] — 15 files, 2 connected modules
- [[boilerplate-vue-frontend_src_modules_wishlist|src/modules/wishlist/]] — 12 files, 2 connected modules
- [[boilerplate-vue-frontend_src_types|src/types/]] — 5 files, 0 connected modules
- [[boilerplate-vue-frontend_src_ui|src/ui/]] — 22 files, 0 connected modules
- [[boilerplate-vue-frontend_tests_cross-cutting|tests/cross-cutting/]] — 11 files, 2 connected modules
- [[boilerplate-vue-frontend_tests_e2e|tests/e2e/]] — 10 files, 1 connected module
- [[boilerplate-vue-frontend_tests_support|tests/support/]] — 13 files, 15 connected modules
- [[boilerplate-vue-frontend_tests_unit|tests/unit/]] — 38 files, 4 connected modules
- [[boilerplate-vue-frontend_ROOT|/ (repository root)]] — 33 files, 9 connected modules
