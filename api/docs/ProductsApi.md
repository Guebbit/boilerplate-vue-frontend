# ProductsApi

All URIs are relative to *http://localhost:3000*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**createProduct**](#createproduct) | **POST** /products | Create product|
|[**deleteProduct**](#deleteproduct) | **DELETE** /products | Delete product|
|[**deleteProductById**](#deleteproductbyid) | **DELETE** /products/{id} | Delete product|
|[**getProductById**](#getproductbyid) | **GET** /products/{id} | Product details|
|[**listProducts**](#listproducts) | **GET** /products | List products (paginated)|
|[**searchProducts**](#searchproducts) | **POST** /products/search | Search products (DTO-friendly)|
|[**updateProduct**](#updateproduct) | **PUT** /products | Edit product|
|[**updateProductById**](#updateproductbyid) | **PUT** /products/{id} | Edit product|

# **createProduct**
> Product createProduct(createProductRequest)

Creates a new product with optional image upload

### Example

```typescript
import {
    ProductsApi,
    Configuration,
    CreateProductRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ProductsApi(configuration);

let createProductRequest: CreateProductRequest; //

const { status, data } = await apiInstance.createProduct(
    createProductRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createProductRequest** | **CreateProductRequest**|  | |


### Return type

**Product**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json, multipart/form-data
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Created product |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**422** | Validation failed |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **deleteProduct**
> MessageResponse deleteProduct(deleteProductRequest)

Deletes the product identified by the `id` field in the request body. Set `hardDelete` to `true` to permanently remove the record

### Example

```typescript
import {
    ProductsApi,
    Configuration,
    DeleteProductRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ProductsApi(configuration);

let deleteProductRequest: DeleteProductRequest; //

const { status, data } = await apiInstance.deleteProduct(
    deleteProductRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **deleteProductRequest** | **DeleteProductRequest**|  | |


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
|**422** | Validation failed |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **deleteProductById**
> MessageResponse deleteProductById()

Deletes the product identified by `{id}` in the path. Pass the `hardDelete` query parameter as `true` to permanently remove the record. Functionally equivalent to `DELETE /products`.

### Example

```typescript
import {
    ProductsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProductsApi(configuration);

let id: string; //Resource identifier (default to undefined)
let hardDelete: boolean; // (optional) (default to undefined)

const { status, data } = await apiInstance.deleteProductById(
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
|**404** | Resource not found |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getProductById**
> Product getProductById()

Returns the full details of the product identified by `{id}`. Functionally equivalent to `GET /products?id={id}`.

### Example

```typescript
import {
    ProductsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProductsApi(configuration);

let id: string; //Resource identifier (default to undefined)

const { status, data } = await apiInstance.getProductById(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | Resource identifier | defaults to undefined|


### Return type

**Product**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Product |  -  |
|**404** | Resource not found |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listProducts**
> ProductsResponse listProducts()

Returns a paginated list of products.

### Example

```typescript
import {
    ProductsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProductsApi(configuration);

let page: number; //1-based page index (optional) (default to 1)
let pageSize: number; // (optional) (default to 10)
let text: string; // (optional) (default to undefined)
let productId: string; // (optional) (default to undefined)
let minPrice: number; // (optional) (default to undefined)
let maxPrice: number; // (optional) (default to undefined)

const { status, data } = await apiInstance.listProducts(
    page,
    pageSize,
    text,
    productId,
    minPrice,
    maxPrice
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **page** | [**number**] | 1-based page index | (optional) defaults to 1|
| **pageSize** | [**number**] |  | (optional) defaults to 10|
| **text** | [**string**] |  | (optional) defaults to undefined|
| **productId** | [**string**] |  | (optional) defaults to undefined|
| **minPrice** | [**number**] |  | (optional) defaults to undefined|
| **maxPrice** | [**number**] |  | (optional) defaults to undefined|


### Return type

**ProductsResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Products page |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **searchProducts**
> ProductsResponse searchProducts(searchProductsRequest)

Searches and filters products via a JSON request body. Functionally equivalent to `GET /products` with query parameters.

### Example

```typescript
import {
    ProductsApi,
    Configuration,
    SearchProductsRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ProductsApi(configuration);

let searchProductsRequest: SearchProductsRequest; //

const { status, data } = await apiInstance.searchProducts(
    searchProductsRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **searchProductsRequest** | **SearchProductsRequest**|  | |


### Return type

**ProductsResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Products search results |  -  |
|**422** | Validation failed |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateProduct**
> Product updateProduct(updateProductRequest)

Updates an existing product with optional image upload

### Example

```typescript
import {
    ProductsApi,
    Configuration,
    UpdateProductRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ProductsApi(configuration);

let updateProductRequest: UpdateProductRequest; //

const { status, data } = await apiInstance.updateProduct(
    updateProductRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updateProductRequest** | **UpdateProductRequest**|  | |


### Return type

**Product**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json, multipart/form-data
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated product |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**404** | Resource not found |  -  |
|**422** | Validation failed |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateProductById**
> Product updateProductById(updateProductByIdRequest)

Updates the product identified by `{id}` in the path with optional image upload. Functionally equivalent to `PUT /products` with the id in the body.

### Example

```typescript
import {
    ProductsApi,
    Configuration,
    UpdateProductByIdRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ProductsApi(configuration);

let id: string; //Resource identifier (default to undefined)
let updateProductByIdRequest: UpdateProductByIdRequest; //

const { status, data } = await apiInstance.updateProductById(
    id,
    updateProductByIdRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updateProductByIdRequest** | **UpdateProductByIdRequest**|  | |
| **id** | [**string**] | Resource identifier | defaults to undefined|


### Return type

**Product**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json, multipart/form-data
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated product |  -  |
|**401** | Unauthorized |  -  |
|**422** | Validation failed |  -  |
|**404** | Resource not found |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

