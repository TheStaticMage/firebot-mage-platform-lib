import type { ReplaceVariable } from '@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager';
import type { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import { PlatformUserDatabase } from '../internal/platform-user-database';
import { createPlatformVariableEvaluator } from '../internal/variable-helpers';
import { firebot, logger } from '../main';

function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function createPlatformLastSeenVariable(
    userDatabase: PlatformUserDatabase
): ReplaceVariable {
    return {
        definition: {
            handle: 'platformLastSeen',
            description: 'Displays the date that a viewer was last seen in chat across platforms (Twitch, Kick, YouTube)',
            usage: 'platformLastSeen[username?, platform?]',
            examples: [
                {
                    usage: 'platformLastSeen',
                    description: 'Returns the last seen date for the current viewer'
                },
                {
                    usage: 'platformLastSeen[username]',
                    description: 'Returns the last seen date for the specified viewer'
                },
                {
                    usage: 'platformLastSeen[username, kick]',
                    description: 'Explicitly specify the platform (twitch, kick, youtube)'
                }
            ],
            categories: ['common', 'user based'],
            possibleDataOutput: ['text']
        },
        evaluator: createPlatformVariableEvaluator<string>({
            userDatabase,
            variableName: 'platformLastSeen',
            defaultValue: 'Unknown User',
            handleTwitch: async (username, normalizedUsername) => {
                logger.debug(`platformLastSeen: Getting Twitch last seen for ${username}`);
                try {
                    const { viewerDatabase } = firebot.modules;
                    const viewer = await viewerDatabase.getViewerByUsername(normalizedUsername);
                    if (!viewer || !viewer.lastSeen) {
                        return 'Unknown User';
                    }
                    return formatDate(viewer.lastSeen);
                } catch (error) {
                    logger.debug(`platformLastSeen: Error getting Twitch last seen: ${error}`);
                    return 'Unknown User';
                }
            },
            handlePlatformDb: async (user) => {
                if (!user || !user.lastSeen) {
                    return 'Unknown User';
                }
                return formatDate(user.lastSeen);
            }
        })
    };
}

/**
 * Creates an override variable for lastSeen
 * Matches Firebot's built-in signature: (trigger, username)
 * But adds optional platform parameter at the end
 */
export function createLastSeenOverride(
    userDatabase: PlatformUserDatabase
): ReplaceVariable {
    const baseVariable = createPlatformLastSeenVariable(userDatabase);

    return {
        definition: {
            ...baseVariable.definition,
            handle: 'lastSeen',
            description: 'Displays the date that a viewer was last seen in chat across platforms (Twitch, Kick, YouTube)',
            usage: 'lastSeen[username?, platform?]',
            examples: [
                {
                    usage: 'lastSeen',
                    description: 'Returns the last seen date for the current viewer'
                },
                {
                    usage: 'lastSeen[username]',
                    description: 'Returns the last seen date for the specified viewer'
                },
                {
                    usage: 'lastSeen[username, kick]',
                    description: 'Explicitly specify the platform (twitch, kick, youtube)'
                }
            ]
        },
        evaluator: async (
            trigger: Trigger,
            username?: string,
            platform?: string
        ): Promise<string> => {
            // Call the base evaluator with platform as the third parameter
            return baseVariable.evaluator(trigger, username, platform);
        }
    };
}
