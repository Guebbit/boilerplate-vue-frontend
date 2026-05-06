# AdminApi

All URIs are relative to *http://localhost:3000*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getAdminAuditLogs**](#getadminauditlogs) | **GET** /admin/audit | Recent audit events|
|[**getAdminHealth**](#getadminhealth) | **GET** /admin/health | Admin health summary|
|[**getAdminMetricsSummary**](#getadminmetricssummary) | **GET** /admin/metrics/summary | Metrics summary (JSON)|
|[**getHealth**](#gethealth) | **GET** / | API health check|
|[**getPrometheusMetrics**](#getprometheusmetrics) | **GET** /metrics | Prometheus metrics|

# **getAdminAuditLogs**
> AuditLogsResponse getAdminAuditLogs()

Returns the most recent audit events from the in-memory ring buffer (up to 200). Events include auth flows, admin CRUD actions, and security blocks. Requires admin role. 

### Example

```typescript
import {
    AdminApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AdminApi(configuration);

let actor: string; //Filter by actor user ID (optional) (default to undefined)
let action: string; //Filter by action name (e.g. auth.login.failed) (optional) (default to undefined)
let outcome: 'success' | 'failure'; //Filter by outcome (optional) (default to undefined)
let since: string; //Return events after this ISO-8601 timestamp (optional) (default to undefined)
let limit: number; //Maximum number of events to return (optional) (default to 50)

const { status, data } = await apiInstance.getAdminAuditLogs(
    actor,
    action,
    outcome,
    since,
    limit
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **actor** | [**string**] | Filter by actor user ID | (optional) defaults to undefined|
| **action** | [**string**] | Filter by action name (e.g. auth.login.failed) | (optional) defaults to undefined|
| **outcome** | [**&#39;success&#39; | &#39;failure&#39;**]**Array<&#39;success&#39; &#124; &#39;failure&#39;>** | Filter by outcome | (optional) defaults to undefined|
| **since** | [**string**] | Return events after this ISO-8601 timestamp | (optional) defaults to undefined|
| **limit** | [**number**] | Maximum number of events to return | (optional) defaults to 50|


### Return type

**AuditLogsResponse**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Audit events |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**422** | Validation failed |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getAdminHealth**
> AdminHealthResponse getAdminHealth()

Full JSON health snapshot for the admin dashboard. Includes uptime, database status, memory, integrations, and system info. Requires admin role. 

### Example

```typescript
import {
    AdminApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AdminApi(configuration);

const { status, data } = await apiInstance.getAdminHealth();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**AdminHealthResponse**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Health summary |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getAdminMetricsSummary**
> AdminMetricsSummaryResponse getAdminMetricsSummary()

Key operational metrics derived from Prometheus counters/histograms, returned as structured JSON for dashboard KPI cards and charts. Requires admin role. 

### Example

```typescript
import {
    AdminApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AdminApi(configuration);

const { status, data } = await apiInstance.getAdminMetricsSummary();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**AdminMetricsSummaryResponse**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Metrics summary |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getHealth**
> MessageResponse getHealth()

Returns a simple liveness indicator. Use `GET /admin/health` for the full admin health summary.

### Example

```typescript
import {
    AdminApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AdminApi(configuration);

const { status, data } = await apiInstance.getHealth();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**MessageResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | API is running |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getPrometheusMetrics**
> string getPrometheusMetrics()

Raw Prometheus text (exposition format 0.0.4). Intended for Prometheus scraping, not for browser clients. Use `GET /admin/metrics/summary` for a JSON summary suitable for dashboards. 

### Example

```typescript
import {
    AdminApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AdminApi(configuration);

const { status, data } = await apiInstance.getPrometheusMetrics();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**string**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: text/plain


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Prometheus exposition text |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

