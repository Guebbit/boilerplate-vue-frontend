# UpdateOrderByIdRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**status** | **string** | Updated order status | [optional] [default to undefined]
**userId** | **string** | Resource identifier | [optional] [default to undefined]
**email** | **string** |  | [optional] [default to undefined]
**items** | [**Array&lt;CartItem&gt;**](CartItem.md) |  | [optional] [default to undefined]

## Example

```typescript
import { UpdateOrderByIdRequest } from './api';

const instance: UpdateOrderByIdRequest = {
    status,
    userId,
    email,
    items,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
