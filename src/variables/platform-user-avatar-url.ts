import type { ReplaceVariable } from '@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager';
import type { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import { PlatformUserDatabase } from '../internal/platform-user-database';
import { createPlatformVariableEvaluator } from '../internal/variable-helpers';
import { firebot, logger } from '../main';
import { normalizeUsername } from '../internal/trigger-helpers';

export function createPlatformUserAvatarUrlVariable(
    userDatabase: PlatformUserDatabase
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
        evaluator: createPlatformVariableEvaluator<string>({
            userDatabase,
            variableName: 'platformUserAvatarUrl',
            defaultValue: '[No avatar found]',
            handleTwitch: async (username) => {
                logger.debug(`platformUserAvatarUrl: Getting Twitch avatar for ${username}`);
                const { twitchApi } = firebot.modules;
                try {
                    const normalizedUsername = normalizeUsername(username);
                    const userInfo = await twitchApi.users.getUserByName(normalizedUsername);
                    return userInfo.profilePictureUrl ? userInfo.profilePictureUrl : '[No Avatar Found]';
                } catch {
                    return '[No Avatar Found]';
                }
            },
            handlePlatformDb: async (user) => {
                return user?.profilePicUrl || '[No avatar found]';
            }
        })
    };
}

/**
 * Creates an override variable for userAvatarUrl
 * Matches Firebot's built-in signature: (trigger, username)
 * But adds optional platform parameter at the end
 */
export function createUserAvatarUrlOverride(
    userDatabase: PlatformUserDatabase
): ReplaceVariable {
    const baseVariable = createPlatformUserAvatarUrlVariable(userDatabase);

    return {
        definition: {
            ...baseVariable.definition,
            handle: 'userAvatarUrl',
            aliases: ['userProfileImageUrl'],
            description: 'Gets the URL for the avatar of the specified user across platforms (Twitch, Kick, YouTube)',
            usage: 'userAvatarUrl[username?, platform?]',
            examples: [
                {
                    usage: 'userAvatarUrl',
                    description: 'Returns the avatar URL for the current user from the trigger'
                },
                {
                    usage: 'userAvatarUrl[testuser]',
                    description: 'Returns the avatar URL for the specified username'
                },
                {
                    usage: 'userAvatarUrl[testuser, kick]',
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
