# AdminMetricsSummaryHttp


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**totalRequests** | **number** |  | [default to undefined]
**totalErrors** | **number** |  | [default to undefined]
**errorRate** | **number** | Fraction of requests that returned 4xx/5xx | [default to undefined]
**inFlight** | **number** |  | [default to undefined]
**latencyMs** | [**AdminMetricsLatency**](AdminMetricsLatency.md) |  | [default to undefined]

## Example

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

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
