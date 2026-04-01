# SearchOrdersRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**page** | **number** | 1-based page index | [optional] [default to 1]
**pageSize** | **number** | Optional override; server may clamp to a max | [optional] [default to 10]
**id** | **string** | Resource identifier | [optional] [default to undefined]
**userId** | **string** | Resource identifier | [optional] [default to undefined]
**productId** | **string** | Resource identifier | [optional] [default to undefined]
**email** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { SearchOrdersRequest } from './api';

const instance: SearchOrdersRequest = {
    page,
    pageSize,
    id,
    userId,
    productId,
    email,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
