import type { ReplaceVariable } from '@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager';
import type { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import { firebot, LogWrapper } from '../main';
import { PlatformUserDatabase } from '../internal/platform-user-database';
import { determineTargetPlatform, extractTriggerUsername } from '../internal/trigger-helpers';

/**
 * Formats a timestamp to yyyy-MM-dd format
 */
function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Creates a platform-aware last seen variable
 * @param userDatabase Platform user database for lookups
 * @param logger Logger instance
 * @returns ReplaceVariable that gets last seen date across platforms
 */
export function createPlatformLastSeenVariable(
    userDatabase: PlatformUserDatabase,
    logger: LogWrapper
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
        evaluator: async (
            trigger: Trigger,
            username?: string,
            platform?: string
        ): Promise<string> => {
            try {
                // Extract username from trigger if not provided
                let targetUsername: string | undefined = username;
                if (!targetUsername) {
                    targetUsername = extractTriggerUsername(trigger) || undefined;
                }

                if (!targetUsername) {
                    logger.debug('platformLastSeen: No username provided');
                    return 'Unknown User';
                }

                // Determine target platform
                const targetPlatform = determineTargetPlatform(platform, targetUsername, trigger);

                if (!targetPlatform || targetPlatform === 'unknown') {
                    logger.debug(`platformLastSeen: Cannot determine platform for username ${targetUsername}`);
                    return 'Unknown User';
                }

                // Twitch: use Firebot's viewer database
                if (targetPlatform === 'twitch') {
                    logger.debug(`platformLastSeen: Getting Twitch last seen for ${targetUsername}`);
                    try {
                        const viewer = await firebot.modules.viewerDatabase.getViewerByUsername(targetUsername);
                        if (!viewer || !viewer.lastSeen) {
                            return 'Unknown User';
                        }
                        return formatDate(viewer.lastSeen);
                    } catch (error) {
                        logger.debug(`platformLastSeen: Error getting Twitch last seen: ${error}`);
                        return 'Unknown User';
                    }
                }

                // Kick/YouTube: use platform user database
                if (targetPlatform === 'kick' || targetPlatform === 'youtube') {
                    logger.debug(`platformLastSeen: Getting ${targetPlatform} last seen for ${targetUsername}`);
                    const normalizedUsername = userDatabase.normalizeUsername(targetUsername);
                    const user = await userDatabase.getUserByUsername(normalizedUsername, targetPlatform);

                    if (!user || !user.lastSeen) {
                        return 'Unknown User';
                    }

                    return formatDate(user.lastSeen);
                }

                logger.debug(`platformLastSeen: Platform ${targetPlatform} not supported`);
                return 'Unknown User';
            } catch (error) {
                logger.debug(`platformLastSeen error: ${error}`);
                return 'Unknown User';
            }
        }
    };
}
