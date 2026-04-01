# PasswordResetConfirmRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**token** | **string** | One-time password reset token (NOT a JWT). | [default to undefined]
**password** | **string** |  | [default to undefined]
**passwordConfirm** | **string** |  | [default to undefined]

## Example

```typescript
import { PasswordResetConfirmRequest } from './api';

const instance: PasswordResetConfirmRequest = {
    token,
    password,
    passwordConfirm,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
