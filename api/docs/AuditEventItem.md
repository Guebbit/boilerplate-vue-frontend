# AuditEventItem


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**actor_user_id** | **string** |  | [default to undefined]
**actor_role** | **string** |  | [default to undefined]
**action** | **string** | Dot-notation action name (e.g. auth.login.succeeded) | [default to undefined]
**outcome** | **string** |  | [default to undefined]
**ip** | **string** |  | [optional] [default to undefined]
**user_agent** | **string** |  | [optional] [default to undefined]
**request_id** | **string** |  | [optional] [default to undefined]
**trace_id** | **string** |  | [optional] [default to undefined]
**target_type** | **string** |  | [optional] [default to undefined]
**target_id** | **string** |  | [optional] [default to undefined]
**metadata** | **{ [key: string]: any; }** |  | [optional] [default to undefined]
**timestamp** | **string** |  | [default to undefined]
**level** | **string** |  | [default to undefined]

## Example

```typescript
import { AuditEventItem } from './api';

const instance: AuditEventItem = {
    actor_user_id,
    actor_role,
    action,
    outcome,
    ip,
    user_agent,
    request_id,
    trace_id,
    target_type,
    target_id,
    metadata,
    timestamp,
    level,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
