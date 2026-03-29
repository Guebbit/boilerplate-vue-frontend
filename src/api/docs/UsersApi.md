# UsersApi

All URIs are relative to *http://localhost:3000*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**createUser**](#createuser) | **POST** /users | Create user|
|[**deleteUser**](#deleteuser) | **DELETE** /users | Delete user|
|[**deleteUserById**](#deleteuserbyid) | **DELETE** /users/{id} | Delete user|
|[**getUserById**](#getuserbyid) | **GET** /users/{id} | User details|
|[**listUsers**](#listusers) | **GET** /users | List users (paginated)|
|[**searchUsers**](#searchusers) | **POST** /users/search | Search users (DTO-friendly)|
|[**updateUser**](#updateuser) | **PUT** /users | Edit user|
|[**updateUserById**](#updateuserbyid) | **PUT** /users/{id} | Edit user|

# **createUser**
> User createUser(createUserRequest)

Creates a new user account with the supplied email, username, and password.

### Example

```typescript
import {
    UsersApi,
    Configuration,
    CreateUserRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new UsersApi(configuration);

let createUserRequest: CreateUserRequest; //

const { status, data } = await apiInstance.createUser(
    createUserRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createUserRequest** | **CreateUserRequest**|  | |


### Return type

**User**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Created user |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**422** | Validation failed |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **deleteUser**
> MessageResponse deleteUser(deleteUserRequest)

Deletes the user identified by the `id` field in the request body. Set `hardDelete` to `true` to permanently remove the record.

### Example

```typescript
import {
    UsersApi,
    Configuration,
    DeleteUserRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new UsersApi(configuration);

let deleteUserRequest: DeleteUserRequest; //

const { status, data } = await apiInstance.deleteUser(
    deleteUserRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **deleteUserRequest** | **DeleteUserRequest**|  | |


### Return type

**MessageResponse**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Success |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**404** | Resource not found |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **deleteUserById**
> MessageResponse deleteUserById()

Deletes the user identified by `{id}` in the path. Pass the `hardDelete` query parameter as `true` to permanently remove the record. Functionally equivalent to `DELETE /users`.

### Example

```typescript
import {
    UsersApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new UsersApi(configuration);

let id: string; //Resource identifier (default to undefined)
let hardDelete: boolean; // (optional) (default to undefined)

const { status, data } = await apiInstance.deleteUserById(
    id,
    hardDelete
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | Resource identifier | defaults to undefined|
| **hardDelete** | [**boolean**] |  | (optional) defaults to undefined|


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
|**404** | Resource not found |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getUserById**
> User getUserById()

Returns the full profile of the user identified by `{id}`. Functionally equivalent to `GET /users?id={id}`.

### Example

```typescript
import {
    UsersApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new UsersApi(configuration);

let id: string; //Resource identifier (default to undefined)

const { status, data } = await apiInstance.getUserById(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | Resource identifier | defaults to undefined|


### Return type

**User**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | User |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**404** | Resource not found |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listUsers**
> UsersResponse listUsers()

Returns a paginated list of user accounts.

### Example

```typescript
import {
    UsersApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new UsersApi(configuration);

let id: string; // (optional) (default to undefined)
let page: number; //1-based page index (optional) (default to 1)
let pageSize: number; // (optional) (default to 10)
let text: string; // (optional) (default to undefined)
let email: string; // (optional) (default to undefined)
let username: string; // (optional) (default to undefined)
let active: boolean; // (optional) (default to undefined)

const { status, data } = await apiInstance.listUsers(
    id,
    page,
    pageSize,
    text,
    email,
    username,
    active
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] |  | (optional) defaults to undefined|
| **page** | [**number**] | 1-based page index | (optional) defaults to 1|
| **pageSize** | [**number**] |  | (optional) defaults to 10|
| **text** | [**string**] |  | (optional) defaults to undefined|
| **email** | [**string**] |  | (optional) defaults to undefined|
| **username** | [**string**] |  | (optional) defaults to undefined|
| **active** | [**boolean**] |  | (optional) defaults to undefined|


### Return type

**UsersResponse**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Users list page |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **searchUsers**
> UsersResponse searchUsers(searchUsersRequest)

Searches and filters users via a JSON request body. Functionally equivalent to `GET /users` with query parameters

### Example

```typescript
import {
    UsersApi,
    Configuration,
    SearchUsersRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new UsersApi(configuration);

let searchUsersRequest: SearchUsersRequest; //

const { status, data } = await apiInstance.searchUsers(
    searchUsersRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **searchUsersRequest** | **SearchUsersRequest**|  | |


### Return type

**UsersResponse**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Users search results |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**422** | Validation failed |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateUser**
> User updateUser(updateUserRequest)

Updates an existing user\'s email or password.

### Example

```typescript
import {
    UsersApi,
    Configuration,
    UpdateUserRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new UsersApi(configuration);

let updateUserRequest: UpdateUserRequest; //

const { status, data } = await apiInstance.updateUser(
    updateUserRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updateUserRequest** | **UpdateUserRequest**|  | |


### Return type

**User**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated user |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**422** | Validation failed |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateUserById**
> User updateUserById(updateUserByIdRequest)

Updates the email or password of the user identified by `{id}` in the path.

### Example

```typescript
import {
    UsersApi,
    Configuration,
    UpdateUserByIdRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new UsersApi(configuration);

let id: string; //Resource identifier (default to undefined)
let updateUserByIdRequest: UpdateUserByIdRequest; //

const { status, data } = await apiInstance.updateUserById(
    id,
    updateUserByIdRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updateUserByIdRequest** | **UpdateUserByIdRequest**|  | |
| **id** | [**string**] | Resource identifier | defaults to undefined|


### Return type

**User**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated user |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**422** | Validation failed |  -  |
|**404** | Resource not found |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

