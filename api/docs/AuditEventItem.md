# AuditEventItem


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**actorUserId** | **string** |  | [default to undefined]
**actorRole** | **string** |  | [default to undefined]
**action** | **string** | Dot-notation action name (e.g. auth.login.succeeded) | [default to undefined]
**outcome** | **string** |  | [default to undefined]
**ip** | **string** |  | [optional] [default to undefined]
**userAgent** | **string** |  | [optional] [default to undefined]
**requestId** | **string** |  | [optional] [default to undefined]
**traceId** | **string** |  | [optional] [default to undefined]
**targetType** | **string** |  | [optional] [default to undefined]
**targetId** | **string** |  | [optional] [default to undefined]
**metadata** | **{ [key: string]: any; }** |  | [optional] [default to undefined]
**timestamp** | **string** |  | [default to undefined]
**level** | **string** |  | [default to undefined]

## Example

```typescript
import { AuditEventItem } from './api';

const instance: AuditEventItem = {
    actorUserId,
    actorRole,
    action,
    outcome,
    ip,
    userAgent,
    requestId,
    traceId,
    targetType,
    targetId,
    metadata,
    timestamp,
    level,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
