# AdminMetrics

## AdminMetricsSummary

### Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**http** | **AdminMetricsSummaryHttp** |  | [default to undefined]
**auth** | **AdminMetricsSummaryAuth** |  | [default to undefined]
**business** | **AdminMetricsSummaryBusiness** |  | [default to undefined]
**database** | **AdminMetricsSummaryDatabase** |  | [default to undefined]
**process** | **AdminMetricsSummaryProcess** |  | [default to undefined]
**timestamp** | **string** |  | [default to undefined]

### Example

```typescript
import { AdminMetricsSummary } from './api';

const instance: AdminMetricsSummary = {
    http,
    auth,
    business,
    database,
    process,
    timestamp,
};
```

## AdminMetricsSummaryHttp

### Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**totalRequests** | **number** |  | [default to undefined]
**totalErrors** | **number** |  | [default to undefined]
**errorRate** | **number** | Fraction of requests that returned 4xx/5xx | [default to undefined]
**inFlight** | **number** |  | [default to undefined]
**latencyMs** | **AdminMetricsLatency** |  | [default to undefined]

### Example

```typescript
import { AdminMetricsSummaryHttp } from './api';

const instance: AdminMetricsSummaryHttp = {
    totalRequests,
    totalErrors,
    errorRate,
    inFlight,
    latencyMs,
};
```

## AdminMetricsLatency

### Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**p50** | **number** | Median latency in ms | [default to undefined]
**p95** | **number** | 95th-percentile latency in ms | [default to undefined]

### Example

```typescript
import { AdminMetricsLatency } from './api';

const instance: AdminMetricsLatency = {
    p50,
    p95,
};
```

## AdminMetricsSummaryAuth

### Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**loginSuccess** | **number** |  | [optional] [default to undefined]
**loginFailure** | **number** |  | [optional] [default to undefined]
**signupSuccess** | **number** |  | [optional] [default to undefined]

### Example

```typescript
import { AdminMetricsSummaryAuth } from './api';

const instance: AdminMetricsSummaryAuth = {
    loginSuccess,
    loginFailure,
    signupSuccess,
};
```

## AdminMetricsSummaryBusiness

### Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**checkoutSuccess** | **number** |  | [optional] [default to undefined]
**ordersCreated** | **number** |  | [optional] [default to undefined]

### Example

```typescript
import { AdminMetricsSummaryBusiness } from './api';

const instance: AdminMetricsSummaryBusiness = {
    checkoutSuccess,
    ordersCreated,
};
```

## AdminMetricsSummaryDatabase

### Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**queriesTotal** | **number** |  | [optional] [default to undefined]
**errorsTotal** | **number** |  | [optional] [default to undefined]

### Example

```typescript
import { AdminMetricsSummaryDatabase } from './api';

const instance: AdminMetricsSummaryDatabase = {
    queriesTotal,
    errorsTotal,
};
```

## AdminMetricsSummaryProcess

### Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**uptimeSeconds** | **number** |  | [optional] [default to undefined]
**heapUsedMb** | **number** |  | [optional] [default to undefined]

### Example

```typescript
import { AdminMetricsSummaryProcess } from './api';

const instance: AdminMetricsSummaryProcess = {
    uptimeSeconds,
    heapUsedMb,
};
```

## AdminMetricsSummaryResponse

### Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**success** | **boolean** |  | [default to undefined]
**data** | **AdminMetricsSummary** |  | [default to undefined]

### Example

```typescript
import { AdminMetricsSummaryResponse } from './api';

const instance: AdminMetricsSummaryResponse = {
    success,
    data,
};
```

[[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
