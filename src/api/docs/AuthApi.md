# AuthApi

All URIs are relative to *http://localhost:3000*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**confirmPasswordReset**](#confirmpasswordreset) | **POST** /account/reset-confirm | |
|[**login**](#login) | **POST** /account/login | Login|
|[**requestPasswordReset**](#requestpasswordreset) | **POST** /account/reset | |
|[**signup**](#signup) | **POST** /account/signup | Signup|

# **confirmPasswordReset**
> MessageResponse confirmPasswordReset(passwordResetConfirmRequest)

Completes the password-reset flow. Validates the one-time reset token issued by `/account/reset` and, if valid, updates the user\'s password to the supplied value.

### Example

```typescript
import {
    AuthApi,
    Configuration,
    PasswordResetConfirmRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new AuthApi(configuration);

let passwordResetConfirmRequest: PasswordResetConfirmRequest; //

const { status, data } = await apiInstance.confirmPasswordReset(
    passwordResetConfirmRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **passwordResetConfirmRequest** | **PasswordResetConfirmRequest**|  | |


### Return type

**MessageResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Success |  -  |
|**422** | Validation failed |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **login**
> AuthTokens login(loginRequest)

Authenticates a user with email and password credentials. On success, returns a JWT access token that must be passed as a Bearer token on subsequent authenticated requests.

### Example

```typescript
import {
    AuthApi,
    Configuration,
    LoginRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new AuthApi(configuration);

let loginRequest: LoginRequest; //

const { status, data } = await apiInstance.login(
    loginRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **loginRequest** | **LoginRequest**|  | |


### Return type

**AuthTokens**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Auth tokens |  -  |
|**401** | Unauthorized |  -  |
|**422** | Validation failed |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **requestPasswordReset**
> MessageResponse requestPasswordReset(passwordResetRequest)

Initiates the password-reset flow by sending a one-time reset token to the provided email address. The token should then be submitted to `/account/reset-confirm`.

### Example

```typescript
import {
    AuthApi,
    Configuration,
    PasswordResetRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new AuthApi(configuration);

let passwordResetRequest: PasswordResetRequest; //

const { status, data } = await apiInstance.requestPasswordReset(
    passwordResetRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **passwordResetRequest** | **PasswordResetRequest**|  | |


### Return type

**MessageResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Success |  -  |
|**422** | Validation failed |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **signup**
> User signup(signupRequest)

Registers a new user account. Returns the newly created user profile on success.

### Example

```typescript
import {
    AuthApi,
    Configuration,
    SignupRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new AuthApi(configuration);

let signupRequest: SignupRequest; //

const { status, data } = await apiInstance.signup(
    signupRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **signupRequest** | **SignupRequest**|  | |


### Return type

**User**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Created |  -  |
|**422** | Validation failed |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

