# CartApi

All URIs are relative to *http://localhost:3000*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**clearCart**](#clearcart) | **DELETE** /cart | Empty cart or, if productId is set, remove target cart item|
|[**getCart**](#getcart) | **GET** /cart | Get cart|
|[**getCartSummary**](#getcartsummary) | **GET** /cart/summary | Get cart summary|
|[**removeCartItem**](#removecartitem) | **DELETE** /cart/{productId} | Remove item from cart|
|[**updateCartItemById**](#updatecartitembyid) | **PUT** /cart/{productId} | Set cart item quantity|
|[**upsertCartItem**](#upsertcartitem) | **POST** /cart | Add/Edit cart item|

# **clearCart**
> CartResponse clearCart()

Clear cart or, ir productId is set, removes a specific product from the authenticated user\'s cart. Returns the updated cart (can be empty)

### Example

```typescript
import {
    CartApi,
    Configuration,
    RemoveCartItemRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CartApi(configuration);

let removeCartItemRequest: RemoveCartItemRequest; // (optional)

const { status, data } = await apiInstance.clearCart(
    removeCartItemRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **removeCartItemRequest** | **RemoveCartItemRequest**|  | |


### Return type

**CartResponse**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Cart cleared |  -  |
|**401** | Unauthorized |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getCart**
> CartResponse getCart()

Returns all items currently in the authenticated user\'s cart along with a computed summary

### Example

```typescript
import {
    CartApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CartApi(configuration);

const { status, data } = await apiInstance.getCart();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**CartResponse**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Cart items |  -  |
|**401** | Unauthorized |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getCartSummary**
> CartSummaryResponse getCartSummary()

Returns a lightweight summary of the authenticated user\'s cart.

### Example

```typescript
import {
    CartApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CartApi(configuration);

const { status, data } = await apiInstance.getCartSummary();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**CartSummaryResponse**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Cart summary |  -  |
|**401** | Unauthorized |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **removeCartItem**
> CartResponse removeCartItem()

Removes the cart line for the product identified by `{productId}` in the path from the authenticated user\'s cart. Returns the updated cart.

### Example

```typescript
import {
    CartApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CartApi(configuration);

let productId: string; //Product identifier (default to undefined)

const { status, data } = await apiInstance.removeCartItem(
    productId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **productId** | [**string**] | Product identifier | defaults to undefined|


### Return type

**CartResponse**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated cart |  -  |
|**401** | Unauthorized |  -  |
|**404** | Resource not found |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateCartItemById**
> CartResponse updateCartItemById(updateCartItemByIdRequest)

Sets the quantity of the cart line for the product identified by `{productId}` in the path. Functionally equivalent to `POST /cart`. Returns the updated cart.

### Example

```typescript
import {
    CartApi,
    Configuration,
    UpdateCartItemByIdRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CartApi(configuration);

let productId: string; //Product identifier (default to undefined)
let updateCartItemByIdRequest: UpdateCartItemByIdRequest; //

const { status, data } = await apiInstance.updateCartItemById(
    productId,
    updateCartItemByIdRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updateCartItemByIdRequest** | **UpdateCartItemByIdRequest**|  | |
| **productId** | [**string**] | Product identifier | defaults to undefined|


### Return type

**CartResponse**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated cart |  -  |
|**401** | Unauthorized |  -  |
|**404** | Resource not found |  -  |
|**422** | Validation failed |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **upsertCartItem**
> CartResponse upsertCartItem(upsertCartItemRequest)

Adds or edit a product to the authenticated user\'s cart. Returns the updated cart.

### Example

```typescript
import {
    CartApi,
    Configuration,
    UpsertCartItemRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CartApi(configuration);

let upsertCartItemRequest: UpsertCartItemRequest; //

const { status, data } = await apiInstance.upsertCartItem(
    upsertCartItemRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **upsertCartItemRequest** | **UpsertCartItemRequest**|  | |


### Return type

**CartResponse**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Add/Edit to cart |  -  |
|**401** | Unauthorized |  -  |
|**422** | Validation failed |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

