/**
 * HTTP client types for integration operations
 */

/**
 * HTTP request options
 */
export interface HttpRequestOptions {
    timeout?: number;
    retries?: number;
}

/**
 * HTTP response wrapper
 */
export interface HttpResponse<T> {
    data: T;
    status: number;
    statusText: string;
}

/**
 * Error response from integration
 */
export interface ErrorResponse {
    success: false;
    error: string;
}

/**
 * Retry configuration for a specific operation type
 */
export interface RetryConfig {
    maxRetries: number;
    shouldRetry: (error: Error, attempt: number) => boolean;
    getBackoffMs: (attempt: number) => number;
}
