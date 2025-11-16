import { ScriptModules } from '@crowbartools/firebot-custom-scripts-types/types';
import {
    GetUserDisplayNameRequest,
    GetUserDisplayNameResponse,
    SendChatMessageRequest,
    SendChatMessageResponse
} from '@thestaticmage/mage-platform-lib-client';
import { LogWrapper } from '../main';

/**
 * Handles Twitch-specific operations like chat messages and user display names
 */
export class TwitchOperationHandler {
    private modules: ScriptModules;
    private logger: LogWrapper;

    constructor(modules: ScriptModules, logger: LogWrapper) {
        this.modules = modules;
        this.logger = logger;
    }

    /**
     * Sends a chat message to Twitch
     */
    async sendChatMessage(request: SendChatMessageRequest): Promise<SendChatMessageResponse> {
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
    async getUserDisplayName(
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
