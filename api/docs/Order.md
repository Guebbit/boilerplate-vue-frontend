# Order


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **string** | Resource identifier | [default to undefined]
**userId** | **string** | Resource identifier | [default to undefined]
**email** | **string** |  | [default to undefined]
**items** | [**Array&lt;CartItem&gt;**](CartItem.md) |  | [default to undefined]
**total** | **number** |  | [default to undefined]
**notes** | **string** | Optional order notes | [optional] [default to undefined]
**status** | **string** |  | [default to undefined]
**createdAt** | **string** |  | [optional] [default to undefined]
**updatedAt** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { Order } from './api';

const instance: Order = {
    id,
    userId,
    email,
    items,
    total,
    notes,
    status,
    createdAt,
    updatedAt,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
