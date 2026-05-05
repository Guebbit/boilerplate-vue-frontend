# AdminHealth

## AdminHealth

### Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**status** | **string** |  | [default to undefined]
**environment** | **string** |  | [default to undefined]
**service** | **string** |  | [default to undefined]
**nodeVersion** | **string** |  | [default to undefined]
**uptimeSeconds** | **number** |  | [default to undefined]
**database** | **AdminHealthDatabase** |  | [default to undefined]
**integrations** | **AdminHealthIntegrations** |  | [optional] [default to undefined]
**memory** | **AdminHealthMemory** |  | [optional] [default to undefined]
**system** | **AdminHealthSystem** |  | [optional] [default to undefined]
**timestamp** | **string** |  | [default to undefined]

### Example

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

## AdminHealthDatabase

### Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**status** | **string** |  | [default to undefined]

### Example

```typescript
import { AdminHealthDatabase } from './api';

const instance: AdminHealthDatabase = {
    status,
};
```

## AdminHealthIntegrations

### Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**loki** | **boolean** |  | [optional] [default to undefined]
**posthog** | **boolean** |  | [optional] [default to undefined]
**otelEnabled** | **boolean** |  | [optional] [default to undefined]

### Example

```typescript
import { AdminHealthIntegrations } from './api';

const instance: AdminHealthIntegrations = {
    loki,
    posthog,
    otelEnabled,
};
```

## AdminHealthMemory

### Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**heapUsedMb** | **number** |  | [default to undefined]
**heapTotalMb** | **number** |  | [default to undefined]
**rssMb** | **number** |  | [default to undefined]

### Example

```typescript
import { AdminHealthMemory } from './api';

const instance: AdminHealthMemory = {
    heapUsedMb,
    heapTotalMb,
    rssMb,
};
```

## AdminHealthSystem

### Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**platform** | **string** |  | [default to undefined]
**cpuCount** | **number** |  | [default to undefined]
**loadAvg** | **Array<number>** |  | [default to undefined]

### Example

```typescript
import { AdminHealthSystem } from './api';

const instance: AdminHealthSystem = {
    platform,
    cpuCount,
    loadAvg,
};
```

## AdminHealthResponse

### Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**success** | **boolean** |  | [default to undefined]
**data** | **AdminHealth** |  | [default to undefined]

### Example

```typescript
import { AdminHealthResponse } from './api';

const instance: AdminHealthResponse = {
    success,
    data,
};
```

[[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
