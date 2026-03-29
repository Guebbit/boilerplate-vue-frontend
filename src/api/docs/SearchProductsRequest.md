# SearchProductsRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**page** | **number** | 1-based page index | [optional] [default to 1]
**pageSize** | **number** | Optional override; server may clamp to a max | [optional] [default to 10]
**text** | **string** | Free-text search string | [optional] [default to undefined]
**minPrice** | **number** |  | [optional] [default to undefined]
**maxPrice** | **number** |  | [optional] [default to undefined]

## Example

```typescript
import { SearchProductsRequest } from './api';

const instance: SearchProductsRequest = {
    page,
    pageSize,
    text,
    minPrice,
    maxPrice,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
