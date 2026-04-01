# PaginationMeta


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**page** | **number** | 1-based page index | [default to 1]
**pageSize** | **number** | Optional override; server may clamp to a max | [default to 10]
**totalItems** | **number** |  | [default to undefined]
**totalPages** | **number** |  | [default to undefined]

## Example

```typescript
import { PaginationMeta } from './api';

const instance: PaginationMeta = {
    page,
    pageSize,
    totalItems,
    totalPages,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
