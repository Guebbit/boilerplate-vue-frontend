# ValidationErrorResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**success** | **boolean** |  | [default to undefined]
**error** | [**ErrorDetail**](ErrorDetail.md) |  | [default to undefined]
**traceId** | **string** | Correlation ID for support/debugging | [optional] [default to undefined]
**errors** | [**Array&lt;ValidationErrorResponseAllOfErrors&gt;**](ValidationErrorResponseAllOfErrors.md) |  | [default to undefined]

## Example

```typescript
import { ValidationErrorResponse } from './api';

const instance: ValidationErrorResponse = {
    success,
    error,
    traceId,
    errors,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
