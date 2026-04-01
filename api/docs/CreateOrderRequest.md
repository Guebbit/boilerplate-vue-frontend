# CreateOrderRequest

Create a new order.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**userId** | **string** | Resource identifier | [default to undefined]
**email** | **string** |  | [default to undefined]
**items** | [**Array&lt;CartItem&gt;**](CartItem.md) |  | [default to undefined]

## Example

```typescript
import { CreateOrderRequest } from './api';

const instance: CreateOrderRequest = {
    userId,
    email,
    items,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
