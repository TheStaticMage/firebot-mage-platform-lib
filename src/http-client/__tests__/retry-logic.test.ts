import {
    getNetworkErrorRetries,
    getTimeoutErrorRetries,
    get5xxErrorRetries,
    getExponentialBackoffMs,
    getRetryConfig
} from '../retry-logic';

describe('Retry Logic', () => {
    describe('Retry counts', () => {
        it('should return 2 retries for network errors', () => {
            expect(getNetworkErrorRetries()).toBe(2);
        });

        it('should return 1 retry for timeout errors', () => {
            expect(getTimeoutErrorRetries()).toBe(1);
        });

        it('should return 1 retry for 5xx errors', () => {
            expect(get5xxErrorRetries()).toBe(1);
        });
    });

    describe('Exponential backoff', () => {
        it('should return 100ms for first attempt', () => {
            expect(getExponentialBackoffMs(0)).toBe(100);
        });

        it('should return 200ms for second attempt', () => {
            expect(getExponentialBackoffMs(1)).toBe(200);
        });

        it('should return 300ms for third attempt', () => {
            expect(getExponentialBackoffMs(2)).toBe(300);
        });
    });

    describe('Get retry config', () => {
        it('should configure retry for ECONNREFUSED error', () => {
            const error = new Error('Connection refused');
            (error as any).code = 'ECONNREFUSED';

            const config = getRetryConfig(error);

            expect(config.maxRetries).toBe(2);
            expect(config.shouldRetry(error, 0)).toBe(true);
            expect(config.getBackoffMs(0)).toBe(100);
            expect(config.getBackoffMs(1)).toBe(200);
        });

        it('should configure retry for ETIMEDOUT error', () => {
            const error = new Error('Connection timeout');
            (error as any).code = 'ETIMEDOUT';

            const config = getRetryConfig(error);

            expect(config.maxRetries).toBe(2);
            expect(config.shouldRetry(error, 0)).toBe(true);
        });

        it('should configure retry for ECONNABORTED error', () => {
            const error = new Error('Connection aborted');
            (error as any).code = 'ECONNABORTED';

            const config = getRetryConfig(error);

            expect(config.maxRetries).toBe(1);
            expect(config.shouldRetry(error, 0)).toBe(true);
            expect(config.getBackoffMs(0)).toBe(0);
        });

        it('should configure retry for 5xx errors', () => {
            const error = new Error('Server error') as any;
            error.response = { status: 500 };
            error.isAxiosError = true;

            const config = getRetryConfig(error);

            expect(config.maxRetries).toBe(1);
            expect(config.shouldRetry(error, 0)).toBe(true);
            expect(config.getBackoffMs(0)).toBe(100);
        });

        it('should not configure retry for other errors', () => {
            const error = new Error('Unknown error');

            const config = getRetryConfig(error);

            expect(config.maxRetries).toBe(0);
            expect(config.shouldRetry(error, 0)).toBe(false);
        });
    });
});
