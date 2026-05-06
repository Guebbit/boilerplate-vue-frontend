# FeedbackApi

All URIs are relative to *http://localhost:3000*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**createFeedbackRequest**](#createfeedbackrequest) | **POST** /feedback/contact | Submit contact request|
|[**listFeedbackRequests**](#listfeedbackrequests) | **GET** /feedback | List feedback requests|
|[**updateFeedbackRequestStatus**](#updatefeedbackrequeststatus) | **PUT** /feedback/{id} | Update feedback request status|

# **createFeedbackRequest**
> FeedbackRequest createFeedbackRequest(createFeedbackRequest)

Creates a user feedback/contact request and notifies admins via email.

### Example

```typescript
import {
    FeedbackApi,
    Configuration,
    CreateFeedbackRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new FeedbackApi(configuration);

let createFeedbackRequest: CreateFeedbackRequest; //

const { status, data } = await apiInstance.createFeedbackRequest(
    createFeedbackRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createFeedbackRequest** | **CreateFeedbackRequest**|  | |


### Return type

**FeedbackRequest**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Created feedback request |  -  |
|**422** | Validation failed |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listFeedbackRequests**
> FeedbackRequestsResponse listFeedbackRequests()

Returns feedback/contact requests for admin review.

### Example

```typescript
import {
    FeedbackApi,
    Configuration,
    SearchFeedbackRequestsRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new FeedbackApi(configuration);

let searchFeedbackRequestsRequest: SearchFeedbackRequestsRequest; // (optional)

const { status, data } = await apiInstance.listFeedbackRequests(
    searchFeedbackRequestsRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **searchFeedbackRequestsRequest** | **SearchFeedbackRequestsRequest**|  | |


### Return type

**FeedbackRequestsResponse**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Feedback request list |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateFeedbackRequestStatus**
> FeedbackRequest updateFeedbackRequestStatus(updateFeedbackRequestStatusRequest)

Updates status/notes of a feedback request.

### Example

```typescript
import {
    FeedbackApi,
    Configuration,
    UpdateFeedbackRequestStatusRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new FeedbackApi(configuration);

let id: string; //Resource identifier (default to undefined)
let updateFeedbackRequestStatusRequest: UpdateFeedbackRequestStatusRequest; //

const { status, data } = await apiInstance.updateFeedbackRequestStatus(
    id,
    updateFeedbackRequestStatusRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updateFeedbackRequestStatusRequest** | **UpdateFeedbackRequestStatusRequest**|  | |
| **id** | [**string**] | Resource identifier | defaults to undefined|


### Return type

**FeedbackRequest**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated feedback request |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**404** | Resource not found |  -  |
|**422** | Validation failed |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

