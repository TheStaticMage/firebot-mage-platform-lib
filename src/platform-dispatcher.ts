import { ScriptModules } from '@crowbartools/firebot-custom-scripts-types/types';
import {
    OPERATIONS,
    OPERATION_RETRIES,
    OPERATION_TIMEOUTS,
    OperationName,
    PLATFORMS,
    PLATFORM_TO_INTEGRATION,
    SendChatMessageRequest
} from '@thestaticmage/mage-platform-lib-client';
import { HttpClient } from './http-client/client';
import { IntegrationDetector } from './integration-detector';
import { LogWrapper } from './main';
import { TwitchOperationHandler } from './platforms/twitch';

/**
 * Platform dispatcher handles routing operations to Twitch or integrations
 */
export class PlatformDispatcher {
    private integrationDetector: IntegrationDetector;
    private modules: ScriptModules;
    private logger: LogWrapper;
    private httpClient: HttpClient;
    private twitchHandler: TwitchOperationHandler;

    constructor(
        integrationDetector: IntegrationDetector,
        modules: ScriptModules,
        logger: LogWrapper
    ) {
        this.integrationDetector = integrationDetector;
        this.modules = modules;
        this.logger = logger;
        this.httpClient = new HttpClient(logger);
        this.twitchHandler = new TwitchOperationHandler(modules, logger);
    }

    /**
     * Dispatches an operation to the appropriate platform
     * @param operation Operation name
     * @param platform Platform identifier ("twitch", "kick", "youtube", etc.)
     * @param request Operation request data
     * @returns Operation response
     */
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
    async dispatchOperation<TRequest, TResponse>(
        operation: OperationName,
        platform: string,
        request: TRequest
    ): Promise<TResponse> {
        this.logger.debug(`Dispatching ${operation} to ${platform}`);

        if (platform === PLATFORMS.TWITCH) {
            return this.dispatchToTwitch<TResponse>(operation, request);
        }

        // Handle unknown platforms
        if (platform === 'unknown') {
            this.logger.debug(`Platform ${platform} is unknown, returning default response for ${operation}`);
        }

        return this.dispatchToIntegration<TResponse>(platform, operation, request);
    }

    /**
     * Dispatches an operation directly to Twitch using Firebot modules
     * @param operation Operation name
     * @param request Operation request data
     * @returns Operation response
     */
    async dispatchToTwitch<TResponse>(
        operation: OperationName,
        request: unknown
    ): Promise<TResponse> {
        this.logger.debug(`Executing Twitch operation: ${operation}`);

        switch (operation) {
            case OPERATIONS.SEND_CHAT_MESSAGE:
                return this.twitchHandler.sendChatMessage(request as SendChatMessageRequest) as unknown as TResponse;

            default:
                throw new Error(`Unsupported Twitch operation: ${operation}`);
        }
    }

    /**
     * Dispatches an operation to an integration via HTTP
     * @param platform Platform identifier
     * @param operation Operation name
     * @param request Operation request data
     * @returns Operation response
     */
    async dispatchToIntegration<TResponse>(
        platform: string,
        operation: OperationName,
        request: unknown
    ): Promise<TResponse> {
        // Check if integration is detected
        if (!this.integrationDetector.isIntegrationDetected(platform)) {
            throw new Error(`Integration for platform "${platform}" is not installed`);
        }

        // Get Firebot web server port and build base URL
        const webServerPort = this.getWebServerPort();
        const baseUrl = `http://localhost:${webServerPort}`;

        // Map platform to integration ID
        const integrationId = this.mapPlatformToIntegrationId(platform);

        // Build endpoint URL
        const endpoint = `${baseUrl}/integrations/${integrationId}/operations/${operation}`;

        this.logger.debug(`Dispatching to integration via HTTP: ${operation} to ${endpoint}`);

        try {
            const timeout = OPERATION_TIMEOUTS[operation];
            const retries = OPERATION_RETRIES[operation];

            // All operations use POST
            const response = await this.httpClient.post<TResponse>(endpoint, request, {
                timeout,
                retries
            });

            return response.data;
        } catch (error) {
            this.logger.error(`HTTP dispatch failed for ${operation}: ${error}`);
            throw error;
        }
    }

    /**
     * Maps a platform identifier to an integration ID
     */
    private mapPlatformToIntegrationId(platform: string): string {
        return PLATFORM_TO_INTEGRATION[platform] || platform;
    }

    /**
     * Gets Firebot's web server port from settings
     */
    private getWebServerPort(): number {
        try {
            const settingsManager = (this.modules as any).settingsManager;
            if (settingsManager) {
                const port = settingsManager.getSetting('WebServerPort');
                if (typeof port === 'number' && port > 0) {
                    return port;
                }
            }
        } catch (error) {
            this.logger.debug(`Failed to get web server port from settings: ${error}`);
        }

        // Default to 7472 (Firebot's default HTTP server port)
        return 7472;
    }

}
