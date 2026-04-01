# AuthApi

All URIs are relative to *http://localhost:3000*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**confirmPasswordReset**](#confirmpasswordreset) | **POST** /account/reset-confirm | |
|[**deleteExpiredTokens**](#deleteexpiredtokens) | **DELETE** /account/tokens/expired | Remove expired tokens|
|[**login**](#login) | **POST** /account/login | Login|
|[**logoutAll**](#logoutall) | **POST** /account/logout-all | Logout from all devices|
|[**refreshToken**](#refreshtoken) | **GET** /account/refresh | Refresh access token|
|[**refreshTokenWithPath**](#refreshtokenwithpath) | **GET** /account/refresh/{token} | Refresh access token with token in path|
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

# **deleteExpiredTokens**
> MessageResponse deleteExpiredTokens()

Removes all expired tokens (refresh, password-reset, etc.) from every user record in the database. Restricted to administrators.

### Example

```typescript
import {
    AuthApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AuthApi(configuration);

const { status, data } = await apiInstance.deleteExpiredTokens();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**MessageResponse**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Success |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
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

# **logoutAll**
> MessageResponse logoutAll()

Logs out the authenticated user from ALL devices by removing all refresh tokens from the database and clearing authentication cookies.

### Example

```typescript
import {
    AuthApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AuthApi(configuration);

const { status, data } = await apiInstance.logoutAll();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**MessageResponse**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Success |  -  |
|**401** | Unauthorized |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **refreshToken**
> RefreshTokenResponse refreshToken()

Creates a new short-lived access token using a refresh token. The refresh token can be provided as a query parameter, path parameter, or retrieved from the `jwt` cookie.

### Example

```typescript
import {
    AuthApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AuthApi(configuration);

const { status, data } = await apiInstance.refreshToken();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**RefreshTokenResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | New access token |  -  |
|**401** | Unauthorized |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **refreshTokenWithPath**
> RefreshTokenResponse refreshTokenWithPath()

Creates a new short-lived access token using a refresh token provided in the URL path.

### Example

```typescript
import {
    AuthApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AuthApi(configuration);

let token: string; //Refresh token (default to undefined)

const { status, data } = await apiInstance.refreshTokenWithPath(
    token
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **token** | [**string**] | Refresh token | defaults to undefined|


### Return type

**RefreshTokenResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | New access token |  -  |
|**401** | Unauthorized |  -  |
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
> User signup()

Registers a new user account with optional image upload. Returns the newly created user profile on success.

### Example

```typescript
import {
    AuthApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AuthApi(configuration);

let email: string; // (default to undefined)
let username: string; // (default to undefined)
let password: string; // (default to undefined)
let passwordConfirm: string; // (default to undefined)
let imageUpload: File; //Optional user profile image (optional) (default to undefined)

const { status, data } = await apiInstance.signup(
    email,
    username,
    password,
    passwordConfirm,
    imageUpload
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **email** | [**string**] |  | defaults to undefined|
| **username** | [**string**] |  | defaults to undefined|
| **password** | [**string**] |  | defaults to undefined|
| **passwordConfirm** | [**string**] |  | defaults to undefined|
| **imageUpload** | [**File**] | Optional user profile image | (optional) defaults to undefined|


### Return type

**User**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: multipart/form-data
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Created |  -  |
|**422** | Validation failed |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

