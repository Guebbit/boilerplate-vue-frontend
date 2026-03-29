# CartSummaryResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**itemsCount** | **number** | Number of distinct cart lines/items | [default to undefined]
**totalQuantity** | **number** | Sum of quantities across all items | [default to undefined]
**total** | **number** | Sum of item prices * quantity (before tax/shipping/discounts) | [default to undefined]
**currency** | **string** | ISO-4217 currency code (e.g. USD) | [optional] [default to undefined]

## Example

```typescript
import { CartSummaryResponse } from './api';

const instance: CartSummaryResponse = {
    itemsCount,
    totalQuantity,
    total,
    currency,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
