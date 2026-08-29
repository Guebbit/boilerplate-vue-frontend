# Observability Endpoints

The Admin Dashboard (`/:locale/admin`) fetches live operational data from the backend via three protected endpoints. All require an admin JWT.

The SSE stream is consumed separately by `realtimeObservability` store in the `RealtimePlayground` view.

## Endpoints consumed by the FE

| Endpoint                              | Auth  | What the FE shows                                                             |
| ------------------------------------- | ----- | ----------------------------------------------------------------------------- |
| `GET /observability/health`           | admin | API status, DB status, uptime, memory, integrations                           |
| `GET /observability/metrics/overview` | admin | HTTP totals, error rate, in-flight, latency p50/p95, auth & business counters |
| `GET /observability/audit`            | admin | Recent audit events with filters                                              |
| `GET /observability/events`           | none  | SSE stream — live metrics, consumed by realtime stores                        |

## Admin Dashboard implementation

```
src/modules/admin/
├── views/Admin.vue                         ← tab shell (Overview + Audit Log)
├── composables/use-admin-observability.ts    ← fetches all three endpoints; exposes reactive state
└── types.ts                                ← view-model types (IAdminKpi, IAdminAuditFilters)
```

`use-admin-observability.ts` is the single composable for the admin page. It exposes reactive refs that the view binds to directly.

## GET /observability/health — response shape

```json
{
    "status": "ok",
    "environment": "production",
    "service": "boilerplate-node-backend",
    "runtimeVersion": "v22.x.x",
    "uptimeSeconds": 3600,
    "database": { "status": "connected" },
    "integrations": {
        "loki": true,
        "otelEnabled": true,
        "umami": true,
        "faro": true
    },
    "memory": { "heapUsedMb": 45, "heapTotalMb": 80, "rssMb": 120 },
    "system": { "platform": "linux", "cpuCount": 4, "loadAvg": [0.5, 0.3, 0.2] },
    "timestamp": "2026-05-29T09:00:00.000Z"
}
```

## GET /observability/metrics/overview — response shape

```json
{
    "http": {
        "totalRequests": 12500,
        "totalErrors": 23,
        "errorRate": 0.00184,
        "inFlight": 3,
        "latencyMs": { "p50": 12, "p95": 85 }
    },
    "auth": { "loginSuccess": 340, "loginFailure": 12, "signupSuccess": 58 },
    "business": { "checkoutSuccess": 102, "ordersCreated": 97 },
    "process": { "uptimeSeconds": 3600, "heapUsedMb": 45 },
    "timestamp": "2026-05-29T09:00:00.000Z"
}
```

KPI cards rendered from this response:

```text
┌─────────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────────┐
│  API Status │ │   Database   │ │  Uptime  │ │  Requests    │
│     ok      │ │  connected   │ │  1h 30m  │ │    12 500    │
└─────────────┘ └──────────────┘ └──────────┘ └──────────────┘
┌─────────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────────┐
│   Errors    │ │  Error Rate  │ │ Lat. p50 │ │  Lat. p95    │
│     23      │ │    0.18 %    │ │  12 ms   │ │    85 ms     │
└─────────────┘ └──────────────┘ └──────────┘ └──────────────┘
```

## GET /observability/audit — query params

| Param     | Type                   | Description                        |
| --------- | ---------------------- | ---------------------------------- |
| `actor`   | string                 | Filter by user ID                  |
| `action`  | string                 | Filter by action string            |
| `outcome` | `success` \| `failure` | Filter by outcome                  |
| `since`   | ISO-8601               | Return events after this timestamp |
| `limit`   | integer (1–200)        | Max events (default 50)            |

The Audit Log tab passes these filters from `IAdminAuditFilters` reactive state directly as query params.

## Types

All response types are driven by `openapi.yaml` and generated into `contracts/rest/index.ts`:
`ObservabilityHealth`, `ObservabilityMetricsSummary`, `AuditEventItem`, etc.

View-model types specific to the FE layout (`IAdminKpi`, `IAdminAuditFilters`) live in `src/modules/admin/types.ts`.

## Related pages

- [Endpoints](./endpoints.md)
- [Observability (Grafana Faro + Umami)](../tools/observability.md)
- [API overview](./index.md)
