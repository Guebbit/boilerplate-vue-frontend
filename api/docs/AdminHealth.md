# AdminHealth


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**status** | **string** |  | [default to undefined]
**environment** | **string** |  | [default to undefined]
**service** | **string** |  | [default to undefined]
**nodeVersion** | **string** |  | [default to undefined]
**uptimeSeconds** | **number** |  | [default to undefined]
**database** | [**AdminHealthDatabase**](AdminHealthDatabase.md) |  | [default to undefined]
**integrations** | [**AdminHealthIntegrations**](AdminHealthIntegrations.md) |  | [optional] [default to undefined]
**memory** | [**AdminHealthMemory**](AdminHealthMemory.md) |  | [optional] [default to undefined]
**system** | [**AdminHealthSystem**](AdminHealthSystem.md) |  | [optional] [default to undefined]
**timestamp** | **string** |  | [default to undefined]

## Example

```typescript
import { AdminHealth } from './api';

const instance: AdminHealth = {
    status,
    environment,
    service,
    nodeVersion,
    uptimeSeconds,
    database,
    integrations,
    memory,
    system,
    timestamp,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
