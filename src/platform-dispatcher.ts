import { ScriptModules } from '@crowbartools/firebot-custom-scripts-types/types';
import {
    GetUserDisplayNameRequest,
    GetUserDisplayNameResponse,
    OperationName,
    SendChatMessageRequest,
    SendChatMessageResponse
} from '@mage-platform-lib/types';
import { IntegrationDetector } from './integration-detector';
import { LogWrapper } from './main';

/**
 * Default timeout for IPC operations (10 seconds)
 */
const IPC_TIMEOUT_MS = 10000;

/**
 * Platform dispatcher handles routing operations to Twitch or integrations
 */
export class PlatformDispatcher {
    private integrationDetector: IntegrationDetector;
    private frontendCommunicator: ScriptModules['frontendCommunicator'];
    private modules: ScriptModules;
    private logger: LogWrapper;

    constructor(
        integrationDetector: IntegrationDetector,
        frontendCommunicator: ScriptModules['frontendCommunicator'],
        modules: ScriptModules,
        logger: LogWrapper
    ) {
        this.integrationDetector = integrationDetector;
        this.frontendCommunicator = frontendCommunicator;
        this.modules = modules;
        this.logger = logger;
    }

    /**
     * Dispatches an operation to the appropriate platform
     * @param platform Platform identifier ("twitch", "kick", "youtube", etc.)
     * @param operation Operation name
     * @param request Operation request data
     * @returns Operation response
     */
    async dispatch<TResponse>(
        platform: string,
        operation: OperationName,
        request: unknown
    ): Promise<TResponse> {
        this.logger.debug(`Dispatching ${operation} to ${platform}`);

        if (platform === 'twitch') {
            return this.dispatchToTwitch<TResponse>(operation, request);
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
            case 'send-chat-message':
                return this.sendTwitchChatMessage(request as SendChatMessageRequest) as TResponse;

            case 'get-user-display-name':
                return this.getTwitchUserDisplayName(request as GetUserDisplayNameRequest) as TResponse;

            default:
                throw new Error(`Unsupported Twitch operation: ${operation}`);
        }
    }

    /**
     * Dispatches an operation to an integration via IPC
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

        // Get integration info
        const integrationInfo = this.integrationDetector.getDetectedIntegrationInfo(platform);
        if (!integrationInfo) {
            throw new Error(`Integration info not found for platform "${platform}"`);
        }

        // Build IPC event name
        const integrationName = this.getIntegrationName(platform);
        const eventName = `${integrationName}:${operation}`;

        this.logger.debug(`Dispatching to integration via IPC: ${eventName}`);

        // Create timeout promise with clearable timeout
        let timeoutId: NodeJS.Timeout | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new Error(`IPC timeout: ${eventName} did not respond within ${IPC_TIMEOUT_MS}ms`));
            }, IPC_TIMEOUT_MS);
        });

        try {
            // Race between IPC call and timeout
            const response = await Promise.race([
                this.frontendCommunicator.fireEventAsync<TResponse>(eventName, request),
                timeoutPromise
            ]);

            return response;
        } catch (error) {
            this.logger.error(`IPC dispatch failed for ${eventName}: ${error}`);
            throw error;
        } finally {
            // Always clear the timeout to prevent memory leaks
            if (timeoutId !== undefined) {
                clearTimeout(timeoutId);
            }
        }
    }

    /**
     * Gets the integration name for a platform
     * @param platform Platform identifier
     * @returns Integration name for IPC events
     */
    getIntegrationName(platform: string): string {
        // Map platform IDs to integration names
        const integrationNames: Record<string, string> = {
            'kick': 'mage-kick-integration',
            'youtube': 'mage-youtube-integration'
        };

        const name = integrationNames[platform];
        if (!name) {
            throw new Error(`Unknown platform: ${platform}`);
        }

        return name;
    }

    // ========================================================================
    // Twitch Direct Operation Handlers
    // ========================================================================

    /**
     * Sends a chat message to Twitch
     */
    private async sendTwitchChatMessage(request: SendChatMessageRequest): Promise<SendChatMessageResponse> {
        try {
            const { twitchChat } = this.modules;

            if (request.replyId) {
                await twitchChat.sendChatMessage(request.message, undefined, undefined, request.replyId);
            } else {
                await twitchChat.sendChatMessage(request.message);
            }

            this.logger.debug('Twitch chat message sent successfully');
            return { success: true };
        } catch (error) {
            this.logger.error(`Failed to send Twitch chat message: ${error}`);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * Gets a Twitch user's display name
     */
    private async getTwitchUserDisplayName(
        request: GetUserDisplayNameRequest
    ): Promise<GetUserDisplayNameResponse> {
        try {
            const { userDb } = this.modules;

            // Try to get from user database
            const viewer = await userDb.getTwitchUserByUsername(request.username);
            if (viewer && viewer.displayName) {
                this.logger.debug(`Found Twitch display name for ${request.username}: ${viewer.displayName}`);
                return { displayName: viewer.displayName };
            }

            // Fallback to username
            this.logger.debug(`No display name found for ${request.username}, using username`);
            return { displayName: request.username };
        } catch (error) {
            this.logger.error(`Failed to get Twitch user display name: ${error}`);
            return { displayName: null };
        }
    }
}
