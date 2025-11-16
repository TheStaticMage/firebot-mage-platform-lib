import axios, { AxiosInstance } from 'axios';
import { HttpResponse, HttpRequestOptions } from './types';
import { getRetryConfig } from './retry-logic';
import { LogWrapper } from '../main';

/**
 * HTTP client wrapper for making requests to integration endpoints
 */
export class HttpClient {
    private axiosInstance: AxiosInstance;
    private logger: LogWrapper;

    constructor(logger: LogWrapper) {
        this.logger = logger;
        this.axiosInstance = axios.create({
            validateStatus: () => true // Don't throw on any status code
        });
    }

    /**
     * Makes a GET request to an endpoint
     */
    async get<TResponse>(
        url: string,
        options: HttpRequestOptions & { params?: Record<string, any> } = {}
    ): Promise<HttpResponse<TResponse>> {
        const { timeout = 30000, retries: maxRetries = 0, params } = options;

        return this.requestWithRetry<TResponse>(
            async () => {
                const response = await this.axiosInstance.get<TResponse>(url, {
                    timeout,
                    params
                });
                return response;
            },
            url,
            'GET',
            maxRetries
        );
    }

    /**
     * Makes a POST request to an endpoint
     */
    async post<TResponse>(
        url: string,
        data: unknown,
        options: HttpRequestOptions = {}
    ): Promise<HttpResponse<TResponse>> {
        const { timeout = 30000, retries: maxRetries = 0 } = options;

        return this.requestWithRetry<TResponse>(
            async () => {
                const response = await this.axiosInstance.post<TResponse>(url, data, {
                    timeout
                });
                return response;
            },
            url,
            'POST',
            maxRetries
        );
    }

    /**
     * Executes a request with retry logic
     */
    private async requestWithRetry<TResponse>(
        requestFn: () => Promise<any>,
        url: string,
        method: string,
        maxRetries: number
    ): Promise<HttpResponse<TResponse>> {
        let lastError: Error | null = null;
        let attempt = 0;

        while (attempt <= maxRetries) {
            try {
                const response = await requestFn();

                this.logger.debug(
                    `${method} ${url} -> ${response.status} ${response.statusText}`
                );

                return {
                    data: response.data,
                    status: response.status,
                    statusText: response.statusText
                };
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                // Check if we should retry
                const retryConfig = getRetryConfig(lastError);
                if (attempt < retryConfig.maxRetries && retryConfig.shouldRetry(lastError, attempt)) {
                    const backoffMs = retryConfig.getBackoffMs(attempt);
                    this.logger.debug(
                        `Request failed (attempt ${attempt + 1}), retrying in ${backoffMs}ms: ${lastError.message}`
                    );

                    if (backoffMs > 0) {
                        await this.sleep(backoffMs);
                    }

                    attempt++;
                } else {
                    // No more retries
                    this.logger.error(`Request failed after ${attempt + 1} attempt(s): ${lastError.message}`);
                    throw lastError;
                }
            }
        }

        // If we get here, we've exhausted retries
        if (lastError) {
            this.logger.error(`Request failed after ${attempt} attempt(s): ${lastError.message}`);
            throw lastError;
        }

        throw new Error('Unknown error during request');
    }

    /**
     * Sleep for specified milliseconds
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
