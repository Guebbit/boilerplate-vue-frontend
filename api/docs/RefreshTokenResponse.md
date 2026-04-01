# RefreshTokenResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**token** | **string** | New access JWT | [default to undefined]
**refreshToken** | **string** | New refresh token if returned by backend | [optional] [default to undefined]
**expiresIn** | **number** | New access token expiry in seconds | [optional] [default to undefined]

## Example

```typescript
import { RefreshTokenResponse } from './api';

const instance: RefreshTokenResponse = {
    token,
    refreshToken,
    expiresIn,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
