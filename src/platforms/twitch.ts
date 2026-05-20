import type { ScriptModules } from "@crowbartools/firebot-custom-scripts-types/types";
import type {
    SendChatMessageRequest,
    SendChatMessageResponse
} from "@thestaticmage/mage-platform-lib-client";
import type { LogWrapper } from "../main";

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
    async sendChatMessage(
        request: SendChatMessageRequest
    ): Promise<SendChatMessageResponse> {
        try {
            const { twitchApi } = this.modules;

            await twitchApi.chat.sendChatMessage(
                request.message,
                request.replyId ?? undefined
            );

            this.logger.debug("Twitch chat message sent successfully");
            return { success: true };
        } catch (error) {
            this.logger.error(`Failed to send Twitch chat message: ${error}`);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}
