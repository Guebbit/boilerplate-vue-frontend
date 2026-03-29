# SearchUsersRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**page** | **number** | 1-based page index | [optional] [default to 1]
**pageSize** | **number** | Optional override; server may clamp to a max | [optional] [default to 10]
**text** | **string** | Free-text search string | [optional] [default to undefined]
**id** | **string** | Resource identifier | [optional] [default to undefined]
**email** | **string** |  | [optional] [default to undefined]
**username** | **string** |  | [optional] [default to undefined]
**active** | **boolean** |  | [optional] [default to undefined]

## Example

```typescript
import { SearchUsersRequest } from './api';

const instance: SearchUsersRequest = {
    page,
    pageSize,
    text,
    id,
    email,
    username,
    active,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
