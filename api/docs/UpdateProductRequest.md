# UpdateProductRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **string** | Resource identifier | [default to undefined]
**title** | **string** |  | [default to undefined]
**description** | **string** |  | [optional] [default to undefined]
**price** | **number** |  | [default to undefined]
**active** | **boolean** |  | [optional] [default to undefined]
**imageUrl** | **string** |  | [optional] [default to undefined]
**categories** | **Array&lt;string&gt;** |  | [optional] [default to undefined]
**tags** | **Array&lt;string&gt;** |  | [optional] [default to undefined]

## Example

```typescript
import { UpdateProductRequest } from './api';

const instance: UpdateProductRequest = {
    id,
    title,
    description,
    price,
    active,
    imageUrl,
    categories,
    tags,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
