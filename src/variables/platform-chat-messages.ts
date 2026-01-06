import type { ReplaceVariable } from '@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager';
import type { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import { firebot, LogWrapper } from '../main';
import { PlatformUserDatabase } from '../internal/platform-user-database';
import { determineTargetPlatform, extractTriggerUsername } from '../internal/trigger-helpers';

/**
 * Creates a platform-aware chat messages variable
 * @param userDatabase Platform user database for lookups
 * @param logger Logger instance
 * @returns ReplaceVariable that gets chat message count across platforms
 */
export function createPlatformChatMessagesVariable(
    userDatabase: PlatformUserDatabase,
    logger: LogWrapper
): ReplaceVariable {
    return {
        definition: {
            handle: 'platformChatMessages',
            description: 'Displays the number of chat messages for a viewer across platforms (Twitch, Kick, YouTube)',
            usage: 'platformChatMessages[username?, platform?]',
            examples: [
                {
                    usage: 'platformChatMessages',
                    description: 'Returns the number of chat messages for the current viewer'
                },
                {
                    usage: 'platformChatMessages[username]',
                    description: 'Returns the number of chat messages for the specified user'
                },
                {
                    usage: 'platformChatMessages[username, kick]',
                    description: 'Explicitly specify the platform (twitch, kick, youtube)'
                }
            ],
            categories: ['common', 'user based'],
            possibleDataOutput: ['number']
        },
        evaluator: async (
            trigger: Trigger,
            username?: string,
            platform?: string
        ): Promise<number> => {
            try {
                // Extract username from trigger if not provided
                let targetUsername: string | undefined = username;
                if (!targetUsername) {
                    targetUsername = extractTriggerUsername(trigger) || undefined;
                }

                if (!targetUsername) {
                    logger.debug('platformChatMessages: No username provided');
                    return 0;
                }

                // Determine target platform
                const targetPlatform = determineTargetPlatform(platform, targetUsername, trigger);

                if (!targetPlatform || targetPlatform === 'unknown') {
                    logger.debug(`platformChatMessages: Cannot determine platform for username ${targetUsername}`);
                    return 0;
                }

                // Twitch: use Firebot's viewer database
                if (targetPlatform === 'twitch') {
                    logger.debug(`platformChatMessages: Getting Twitch chat messages for ${targetUsername}`);
                    try {
                        const viewer = await firebot.modules.viewerDatabase.getViewerByUsername(targetUsername);
                        return viewer?.chatMessages || 0;
                    } catch (error) {
                        logger.debug(`platformChatMessages: Error getting Twitch chat messages: ${error}`);
                        return 0;
                    }
                }

                // Kick/YouTube: use platform user database
                if (targetPlatform === 'kick' || targetPlatform === 'youtube') {
                    logger.debug(`platformChatMessages: Getting ${targetPlatform} chat messages for ${targetUsername}`);
                    const normalizedUsername = userDatabase.normalizeUsername(targetUsername);
                    const user = await userDatabase.getUserByUsername(normalizedUsername, targetPlatform);

                    return user?.chatMessages || 0;
                }

                logger.debug(`platformChatMessages: Platform ${targetPlatform} not supported`);
                return 0;
            } catch (error) {
                logger.debug(`platformChatMessages error: ${error}`);
                return 0;
            }
        }
    };
}
