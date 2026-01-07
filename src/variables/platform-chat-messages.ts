import type { ReplaceVariable } from '@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager';
import type { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import { PlatformUserDatabase } from '../internal/platform-user-database';
import { createPlatformVariableEvaluator } from '../internal/variable-helpers';
import { firebot, logger } from '../main';

export function createPlatformChatMessagesVariable(
    userDatabase: PlatformUserDatabase
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
        evaluator: createPlatformVariableEvaluator<number>({
            userDatabase,
            variableName: 'platformChatMessages',
            defaultValue: 0,
            handleTwitch: async (username, normalizedUsername) => {
                logger.debug(`platformChatMessages: Getting Twitch chat messages for ${username}`);
                try {
                    const { viewerDatabase } = firebot.modules;
                    const viewer = await viewerDatabase.getViewerByUsername(normalizedUsername);
                    return viewer?.chatMessages || 0;
                } catch (error) {
                    logger.debug(`platformChatMessages: Error getting Twitch chat messages: ${error}`);
                    return 0;
                }
            },
            handlePlatformDb: async (user) => {
                return user?.chatMessages || 0;
            }
        })
    };
}

/**
 * Creates an override variable for chatMessages
 * Matches Firebot's built-in signature: (trigger, username)
 * But adds optional platform parameter at the end
 */
export function createChatMessagesOverride(
    userDatabase: PlatformUserDatabase
): ReplaceVariable {
    const baseVariable = createPlatformChatMessagesVariable(userDatabase);

    return {
        definition: {
            ...baseVariable.definition,
            handle: 'chatMessages',
            description: 'Displays the number of chat messages for a viewer across platforms (Twitch, Kick, YouTube)',
            usage: 'chatMessages[username?, platform?]',
            examples: [
                {
                    usage: 'chatMessages',
                    description: 'Returns the number of chat messages for the current viewer'
                },
                {
                    usage: 'chatMessages[username]',
                    description: 'Returns the number of chat messages for the specified user'
                },
                {
                    usage: 'chatMessages[username, kick]',
                    description: 'Explicitly specify the platform (twitch, kick, youtube)'
                }
            ]
        },
        evaluator: async (
            trigger: Trigger,
            username?: string,
            platform?: string
        ): Promise<number> => {
            // Call the base evaluator with platform as the third parameter
            return baseVariable.evaluator(trigger, username, platform);
        }
    };
}
