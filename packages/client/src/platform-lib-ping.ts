import { DEFAULT_WEB_SERVER_PORT, INTEGRATIONS } from './constants';

/**
 * Response from platform library ping endpoint
 */
export interface PlatformLibPingResponse {
    success: boolean;
    message?: string;
    error?: string;
}

/**
 * Result of platform library ping check
 */
export interface PlatformLibPingResult {
    success: boolean;
    reachable: boolean;
    errorMessage?: string;
}

/**
 * Check if platform library is loaded and running by pinging its HTTP endpoint
 *
 * @param port - The Firebot web server port (default: 7472)
 * @returns Result indicating whether platform library is reachable
 */
export async function checkPlatformLibPing(port: number = DEFAULT_WEB_SERVER_PORT): Promise<PlatformLibPingResult> {
    try {
        const url = `http://localhost:${port}/integrations/${INTEGRATIONS.PLATFORM_LIB}/ping`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            return {
                success: false,
                reachable: false,
                errorMessage: `HTTP ${response.status}: ${response.statusText}`
            };
        }

        const data = await response.json() as PlatformLibPingResponse;

        if (data.success) {
            return {
                success: true,
                reachable: true
            };
        }
        return {
            success: false,
            reachable: true,
            errorMessage: data.error || 'Unknown error from platform library'
        };

    } catch (error) {
        return {
            success: false,
            reachable: false,
            errorMessage: `Failed to reach platform library: ${error}`
        };
    }
}
