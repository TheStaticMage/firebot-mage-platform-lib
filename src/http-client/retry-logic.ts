import axios from 'axios';
import { RetryConfig } from './types';

/**
 * Gets maximum retries for network errors (ECONNREFUSED, ETIMEDOUT)
 */
export function getNetworkErrorRetries(): number {
    return 2;
}

/**
 * Gets maximum retries for timeout errors
 */
export function getTimeoutErrorRetries(): number {
    return 1;
}

/**
 * Gets maximum retries for 5xx errors
 */
export function get5xxErrorRetries(): number {
    return 1;
}

/**
 * Gets backoff milliseconds for exponential backoff
 * Attempt 0 = 100ms, Attempt 1 = 200ms, etc.
 */
export function getExponentialBackoffMs(attempt: number): number {
    return 100 * (attempt + 1);
}

/**
 * Gets retry configuration for an operation
 * Based on error type, returns appropriate retry behavior
 */
export function getRetryConfig(error: any): RetryConfig {
    // Network connection errors: retry up to 2 times with exponential backoff
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        return {
            maxRetries: getNetworkErrorRetries(),
            shouldRetry: () => true,
            getBackoffMs: getExponentialBackoffMs
        };
    }

    // Timeout errors: retry once with no backoff
    if (error.code === 'ECONNABORTED') {
        return {
            maxRetries: getTimeoutErrorRetries(),
            shouldRetry: () => true,
            getBackoffMs: () => 0
        };
    }

    // 5xx errors: retry once with 100ms backoff
    if (axios.isAxiosError(error) && error.response && error.response.status >= 500) {
        return {
            maxRetries: get5xxErrorRetries(),
            shouldRetry: () => true,
            getBackoffMs: () => 100
        };
    }

    // All other errors: no retry
    return {
        maxRetries: 0,
        shouldRetry: () => false,
        getBackoffMs: () => 0
    };
}
