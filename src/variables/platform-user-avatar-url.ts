import type { ReplaceVariable } from '@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager';
import type { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import { firebot, LogWrapper } from '../main';
import { PlatformUserDatabase } from '../internal/platform-user-database';
import { determineTargetPlatform, extractTriggerUsername, normalizeUsername } from '../internal/trigger-helpers';

/**
 * Creates a platform-aware user avatar URL variable
 * @param userDatabase Platform user database for lookups
 * @param logger Logger instance
 * @returns ReplaceVariable that gets user avatar URLs across platforms
 */
export function createPlatformUserAvatarUrlVariable(
    userDatabase: PlatformUserDatabase,
    logger: LogWrapper
): ReplaceVariable {
    return {
        definition: {
            handle: 'platformUserAvatarUrl',
            aliases: ['platformUserProfileImageUrl'],
            description: 'Gets the URL for the avatar of the specified user across platforms (Twitch, Kick, YouTube)',
            usage: 'platformUserAvatarUrl[username?, platform?]',
            examples: [
                {
                    usage: 'platformUserAvatarUrl',
                    description: 'Returns the avatar URL for the current user from the trigger'
                },
                {
                    usage: 'platformUserAvatarUrl[testuser]',
                    description: 'Returns the avatar URL for the specified username'
                },
                {
                    usage: 'platformUserAvatarUrl[testuser, kick]',
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
                    logger.debug('platformUserAvatarUrl: No username provided');
                    return '[No username available]';
                }

                // Determine target platform
                const targetPlatform = determineTargetPlatform(platform, targetUsername, trigger);

                if (!targetPlatform || targetPlatform === 'unknown') {
                    logger.debug(`platformUserAvatarUrl: Cannot determine platform for username ${targetUsername}`);
                    return '[No avatar found]';
                }

                // Twitch: use Twitch API to get avatar URL
                if (targetPlatform === 'twitch') {
                    logger.debug(`platformUserAvatarUrl: Getting Twitch avatar for ${targetUsername}`);
                    const normalizedTwitchUsername = normalizeUsername(targetUsername);
                    try {
                        const twitchApi = firebot.modules.twitchApi as {
                            users: {
                                getUserByName: (username: string) => Promise<{ profilePictureUrl?: string } | null>;
                            };
                        };
                        const userInfo = await twitchApi.users.getUserByName(normalizedTwitchUsername);
                        return userInfo?.profilePictureUrl || '[No avatar found]';
                    } catch (error) {
                        logger.debug(`platformUserAvatarUrl: Error getting Twitch avatar: ${error}`);
                        return '[No avatar found]';
                    }
                }

                // Kick/YouTube: Use platform user database profilePicUrl
                if (targetPlatform === 'kick' || targetPlatform === 'youtube') {
                    logger.debug(`platformUserAvatarUrl: Getting ${targetPlatform} avatar for ${targetUsername}`);
                    const normalizedUsername = normalizeUsername(targetUsername);
                    const user = await userDatabase.getUserByUsername(normalizedUsername, targetPlatform);

                    if (user?.profilePicUrl) {
                        return user.profilePicUrl;
                    }

                    logger.debug(`platformUserAvatarUrl: No profilePicUrl found for ${targetUsername}`);
                    return '[No avatar found]';
                }

                logger.debug(`platformUserAvatarUrl: Platform ${targetPlatform} not supported`);
                return '[No avatar found]';
            } catch (error) {
                logger.debug(`platformUserAvatarUrl error: ${error}`);
                return '[No avatar found]';
            }
        }
    };
}
