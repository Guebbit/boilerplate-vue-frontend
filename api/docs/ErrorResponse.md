# ErrorResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**success** | **boolean** |  | [default to undefined]
**error** | [**ErrorDetail**](ErrorDetail.md) |  | [default to undefined]
**traceId** | **string** | Correlation ID for support/debugging | [optional] [default to undefined]

## Example

```typescript
import { ErrorResponse } from './api';

const instance: ErrorResponse = {
    success,
    error,
    traceId,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
