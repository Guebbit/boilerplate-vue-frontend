# OrdersApi

All URIs are relative to *http://localhost:3000*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**checkout**](#checkout) | **POST** /cart/checkout | Checkout (place order from cart)|
|[**createOrder**](#createorder) | **POST** /orders | Create order|
|[**deleteOrder**](#deleteorder) | **DELETE** /orders | Delete order|
|[**deleteOrderById**](#deleteorderbyid) | **DELETE** /orders/{id} | Delete order|
|[**getOrderById**](#getorderbyid) | **GET** /orders/{id} | Order details|
|[**getOrderInvoice**](#getorderinvoice) | **GET** /orders/{id}/invoice | Download order invoice (PDF)|
|[**listOrders**](#listorders) | **GET** /orders | List orders (paginated)|
|[**searchOrders**](#searchorders) | **POST** /orders/search | Search orders (DTO-friendly)|
|[**updateOrder**](#updateorder) | **PUT** /orders | Update order|
|[**updateOrderById**](#updateorderbyid) | **PUT** /orders/{id} | Edit order|

# **checkout**
> CheckoutResponse checkout()

Converts the authenticated user\'s current cart into a new order. The cart is cleared upon success. An optional email address and order notes can be supplied in the request body. Returns the created order.

### Example

```typescript
import {
    OrdersApi,
    Configuration,
    CheckoutRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new OrdersApi(configuration);

let checkoutRequest: CheckoutRequest; // (optional)

const { status, data } = await apiInstance.checkout(
    checkoutRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **checkoutRequest** | **CheckoutRequest**|  | |


### Return type

**CheckoutResponse**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Order created |  -  |
|**401** | Unauthorized |  -  |
|**422** | Validation failed |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **createOrder**
> Order createOrder(createOrderRequest)

Creates a new order directly from the supplied payload.

### Example

```typescript
import {
    OrdersApi,
    Configuration,
    CreateOrderRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new OrdersApi(configuration);

let createOrderRequest: CreateOrderRequest; //

const { status, data } = await apiInstance.createOrder(
    createOrderRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createOrderRequest** | **CreateOrderRequest**|  | |


### Return type

**Order**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Created order |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**404** | Resource not found |  -  |
|**422** | Validation failed |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **deleteOrder**
> MessageResponse deleteOrder(deleteOrderRequest)

Permanently removes the order identified by id.

### Example

```typescript
import {
    OrdersApi,
    Configuration,
    DeleteOrderRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new OrdersApi(configuration);

let deleteOrderRequest: DeleteOrderRequest; //

const { status, data } = await apiInstance.deleteOrder(
    deleteOrderRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **deleteOrderRequest** | **DeleteOrderRequest**|  | |


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

# **deleteOrderById**
> MessageResponse deleteOrderById()

Permanently removes the order identified by `id`.

### Example

```typescript
import {
    OrdersApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new OrdersApi(configuration);

let id: string; //Resource identifier (default to undefined)

const { status, data } = await apiInstance.deleteOrderById(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | Resource identifier | defaults to undefined|


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

# **getOrderById**
> Order getOrderById()

Returns the full details of the order identified by `{id}`. Functionally equivalent to `GET /orders?id={id}`.

### Example

```typescript
import {
    OrdersApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new OrdersApi(configuration);

let id: string; //Resource identifier (default to undefined)

const { status, data } = await apiInstance.getOrderById(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | Resource identifier | defaults to undefined|


### Return type

**Order**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Order |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**404** | Resource not found |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getOrderInvoice**
> File getOrderInvoice()

Generates and returns the invoice for the order identified by `{id}` as a binary PDF file. The client should save or stream the response with an appropriate `Content-Disposition` header.

### Example

```typescript
import {
    OrdersApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new OrdersApi(configuration);

let id: string; //Resource identifier (default to undefined)

const { status, data } = await apiInstance.getOrderInvoice(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | Resource identifier | defaults to undefined|


### Return type

**File**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/pdf, application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Invoice PDF |  -  |
|**401** | Unauthorized |  -  |
|**404** | Resource not found |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listOrders**
> OrdersResponse listOrders()

Returns a paginated list of orders.

### Example

```typescript
import {
    OrdersApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new OrdersApi(configuration);

let id: string; // (optional) (default to undefined)
let page: number; //1-based page index (optional) (default to 1)
let pageSize: number; // (optional) (default to 10)
let userId: string; // (optional) (default to undefined)
let productId: string; // (optional) (default to undefined)
let email: string; // (optional) (default to undefined)

const { status, data } = await apiInstance.listOrders(
    id,
    page,
    pageSize,
    userId,
    productId,
    email
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] |  | (optional) defaults to undefined|
| **page** | [**number**] | 1-based page index | (optional) defaults to 1|
| **pageSize** | [**number**] |  | (optional) defaults to 10|
| **userId** | [**string**] |  | (optional) defaults to undefined|
| **productId** | [**string**] |  | (optional) defaults to undefined|
| **email** | [**string**] |  | (optional) defaults to undefined|


### Return type

**OrdersResponse**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Orders page |  -  |
|**401** | Unauthorized |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **searchOrders**
> OrdersResponse searchOrders(searchOrdersRequest)

Searches and filters orders via a JSON request body. Functionally equivalent to `GET /orders`.

### Example

```typescript
import {
    OrdersApi,
    Configuration,
    SearchOrdersRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new OrdersApi(configuration);

let searchOrdersRequest: SearchOrdersRequest; //

const { status, data } = await apiInstance.searchOrders(
    searchOrdersRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **searchOrdersRequest** | **SearchOrdersRequest**|  | |


### Return type

**OrdersResponse**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Orders search results |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**422** | Validation failed |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateOrder**
> Order updateOrder(updateOrderRequest)

Updates an existing order identified by id in the request body.

### Example

```typescript
import {
    OrdersApi,
    Configuration,
    UpdateOrderRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new OrdersApi(configuration);

let updateOrderRequest: UpdateOrderRequest; //

const { status, data } = await apiInstance.updateOrder(
    updateOrderRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updateOrderRequest** | **UpdateOrderRequest**|  | |


### Return type

**Order**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated order |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**404** | Resource not found |  -  |
|**422** | Validation failed |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateOrderById**
> Order updateOrderById(updateOrderByIdRequest)

Updates the order identified by `{id}` in the path.

### Example

```typescript
import {
    OrdersApi,
    Configuration,
    UpdateOrderByIdRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new OrdersApi(configuration);

let id: string; //Resource identifier (default to undefined)
let updateOrderByIdRequest: UpdateOrderByIdRequest; //

const { status, data } = await apiInstance.updateOrderById(
    id,
    updateOrderByIdRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updateOrderByIdRequest** | **UpdateOrderByIdRequest**|  | |
| **id** | [**string**] | Resource identifier | defaults to undefined|


### Return type

**Order**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated order |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**404** | Resource not found |  -  |
|**422** | Validation failed |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

