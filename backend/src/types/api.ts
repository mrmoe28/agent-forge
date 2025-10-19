/**
 * API Types and Interfaces
 * 
 * Defines standardized API request/response structures and error handling
 * based on doc_features.md specifications.
 */

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = any> {
  /** Response data */
  data?: T;
  /** Error information */
  error?: ApiError;
  /** Request metadata */
  meta?: ApiMeta;
}

/**
 * API error structure
 */
export interface ApiError {
  /** Error code */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Detailed error information */
  details?: Record<string, any>;
  /** Stack trace (development only) */
  stack?: string;
  /** Error timestamp */
  timestamp: Date;
  /** Request ID for tracing */
  requestId?: string;
}

/**
 * API response metadata
 */
export interface ApiMeta {
  /** Request ID for tracing */
  requestId: string;
  /** Response timestamp */
  timestamp: Date;
  /** Processing time in milliseconds */
  processingTime: number;
  /** API version */
  version: string;
  /** Rate limiting information */
  rateLimit?: RateLimitInfo;
  /** Pagination information */
  pagination?: PaginationInfo;
}

/**
 * Rate limiting information
 */
export interface RateLimitInfo {
  /** Maximum requests allowed */
  limit: number;
  /** Remaining requests */
  remaining: number;
  /** Rate limit reset time */
  resetTime: Date;
  /** Rate limit window in seconds */
  windowSeconds: number;
}

/**
 * Pagination information
 */
export interface PaginationInfo {
  /** Current page number */
  page: number;
  /** Items per page */
  limit: number;
  /** Total items */
  total: number;
  /** Total pages */
  totalPages: number;
  /** Has next page */
  hasNext: boolean;
  /** Has previous page */
  hasPrevious: boolean;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  /** Overall system status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** Individual service statuses */
  services: Record<string, ServiceHealth>;
  /** System uptime in milliseconds */
  uptime: number;
  /** Last check timestamp */
  timestamp: Date;
  /** System version */
  version: string;
}

/**
 * Individual service health
 */
export interface ServiceHealth {
  /** Service status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** Response time in milliseconds */
  responseTime: number;
  /** Error message if unhealthy */
  error?: string;
  /** Service-specific metrics */
  metrics?: Record<string, any>;
  /** Last health check */
  lastCheck: Date;
}

/**
 * API request validation error
 */
export interface ValidationError {
  /** Field path */
  field: string;
  /** Error message */
  message: string;
  /** Invalid value */
  value: any;
  /** Validation rule that failed */
  rule: string;
}

/**
 * Bulk operation request
 */
export interface BulkOperationRequest<T> {
  /** Operation type */
  operation: 'create' | 'update' | 'delete';
  /** Items to operate on */
  items: T[];
  /** Options for bulk operation */
  options?: {
    /** Continue on individual failures */
    continueOnError?: boolean;
    /** Batch size for processing */
    batchSize?: number;
    /** Validate all items before processing */
    validateFirst?: boolean;
  };
}

/**
 * Bulk operation response
 */
export interface BulkOperationResponse<T> {
  /** Operation success flag */
  success: boolean;
  /** Successful operations count */
  successCount: number;
  /** Failed operations count */
  failureCount: number;
  /** Total operations attempted */
  totalCount: number;
  /** Results for each item */
  results: BulkOperationResult<T>[];
  /** Processing time in milliseconds */
  processingTime: number;
}

/**
 * Individual bulk operation result
 */
export interface BulkOperationResult<T> {
  /** Operation success flag */
  success: boolean;
  /** Result data if successful */
  data?: T;
  /** Error information if failed */
  error?: ApiError;
  /** Item index in original array */
  index: number;
}

/**
 * API key information
 */
export interface ApiKeyInfo {
  /** API key ID */
  id: string;
  /** API key name */
  name: string;
  /** Partial key for identification */
  partialKey: string;
  /** Key permissions */
  permissions: string[];
  /** Rate limit for this key */
  rateLimit: number;
  /** Created timestamp */
  createdAt: Date;
  /** Last used timestamp */
  lastUsedAt?: Date;
  /** Expiration timestamp */
  expiresAt?: Date;
  /** Key status */
  status: 'active' | 'inactive' | 'expired' | 'revoked';
}

/**
 * External API integration configuration
 */
export interface ExternalApiConfig {
  /** Service name */
  service: string;
  /** API endpoint base URL */
  baseUrl: string;
  /** Authentication type */
  authType: 'bearer' | 'apikey' | 'oauth' | 'basic';
  /** Rate limiting configuration */
  rateLimit: {
    /** Requests per minute */
    requestsPerMinute: number;
    /** Burst allowance */
    burstLimit: number;
  };
  /** Timeout configuration */
  timeout: {
    /** Connect timeout in milliseconds */
    connect: number;
    /** Request timeout in milliseconds */
    request: number;
  };
  /** Retry configuration */
  retry: {
    /** Maximum retry attempts */
    maxAttempts: number;
    /** Base delay in milliseconds */
    baseDelay: number;
    /** Backoff multiplier */
    backoffMultiplier: number;
  };
}

/**
 * API metrics data
 */
export interface ApiMetrics {
  /** Metric period */
  period: {
    start: Date;
    end: Date;
  };
  /** Request statistics */
  requests: {
    /** Total requests */
    total: number;
    /** Successful requests */
    successful: number;
    /** Failed requests */
    failed: number;
    /** Requests per minute */
    requestsPerMinute: number;
  };
  /** Response time statistics */
  responseTime: {
    /** Average response time */
    average: number;
    /** Median response time */
    median: number;
    /** 95th percentile */
    p95: number;
    /** 99th percentile */
    p99: number;
  };
  /** Error statistics */
  errors: {
    /** Errors by status code */
    byStatusCode: Record<number, number>;
    /** Errors by type */
    byType: Record<string, number>;
    /** Error rate percentage */
    errorRate: number;
  };
  /** Endpoint statistics */
  endpoints: Array<{
    /** Endpoint path */
    path: string;
    /** HTTP method */
    method: string;
    /** Request count */
    requests: number;
    /** Average response time */
    avgResponseTime: number;
    /** Error count */
    errors: number;
  }>;
}

/**
 * Webhook payload structure
 */
export interface WebhookPayload {
  /** Webhook event type */
  event: string;
  /** Event data */
  data: Record<string, any>;
  /** Event timestamp */
  timestamp: Date;
  /** Event ID for deduplication */
  eventId: string;
  /** Source service */
  source: string;
  /** Webhook signature for verification */
  signature?: string;
}

/**
 * Async operation status
 */
export interface AsyncOperationStatus {
  /** Operation ID */
  operationId: string;
  /** Operation status */
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  /** Progress percentage (0-100) */
  progress: number;
  /** Current step description */
  currentStep?: string;
  /** Result data if completed */
  result?: any;
  /** Error information if failed */
  error?: ApiError;
  /** Started timestamp */
  startedAt: Date;
  /** Completed timestamp */
  completedAt?: Date;
  /** Estimated completion time */
  estimatedCompletion?: Date;
}
