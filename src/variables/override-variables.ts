import type { ReplaceVariable } from '@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager';
import type { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import type { PlatformUserDatabase } from '../internal/platform-user-database';
import type { LogWrapper } from '../main';
import { createPlatformAwareUserDisplayNameVariable } from './platform-aware-user-display-name';
import { createPlatformChatMessagesVariable } from './platform-chat-messages';
import { createPlatformCurrencyVariable } from './platform-currency';
import { createPlatformLastSeenVariable } from './platform-last-seen';
import { createPlatformUserAvatarUrlVariable } from './platform-user-avatar-url';
import { createPlatformUserMetadataVariable } from './platform-user-metadata';

/**
 * Creates an override variable for userDisplayName
 * Matches Firebot's built-in signature: (trigger, username)
 * But adds optional platform parameter at the end
 */
export function createUserDisplayNameOverride(
    userDatabase: PlatformUserDatabase,
    logger: LogWrapper
): ReplaceVariable {
    const baseVariable = createPlatformAwareUserDisplayNameVariable(userDatabase, logger);

    return {
        definition: {
            ...baseVariable.definition,
            handle: 'userDisplayName',
            description: 'Gets the platform-aware display name for a user across platforms (Twitch, Kick, YouTube)',
            usage: 'userDisplayName[username?, platform?]',
            examples: [
                {
                    usage: 'userDisplayName',
                    description: 'Returns the display name for the current user from the trigger'
                },
                {
                    usage: 'userDisplayName[testuser]',
                    description: 'Returns the display name for the specified username'
                },
                {
                    usage: 'userDisplayName[testuser, kick]',
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
            // The base evaluator signature is (trigger, username?: string)
            // We need to handle the platform parameter here
            if (platform) {
                // If platform is explicitly provided, we need to append it to username
                // The base evaluator will handle platform detection from username suffix
                const usernameWithPlatform = platform ? `${username}@${platform}` : username;
                return baseVariable.evaluator(trigger, usernameWithPlatform);
            }
            return baseVariable.evaluator(trigger, username);
        }
    };
}

/**
 * Creates an override variable for userAvatarUrl
 * Matches Firebot's built-in signature: (trigger, username)
 * But adds optional platform parameter at the end
 */
export function createUserAvatarUrlOverride(
    userDatabase: PlatformUserDatabase,
    logger: LogWrapper
): ReplaceVariable {
    const baseVariable = createPlatformUserAvatarUrlVariable(userDatabase, logger);

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

/**
 * Creates an override variable for currency
 * Matches Firebot's built-in signature: (trigger, currencyName, username?)
 * But adds optional platform parameter at the end
 */
export function createCurrencyOverride(
    userDatabase: PlatformUserDatabase,
    logger: LogWrapper
): ReplaceVariable {
    const baseVariable = createPlatformCurrencyVariable(userDatabase, logger);

    return {
        definition: {
            ...baseVariable.definition,
            handle: 'currency',
            description: 'Gets currency amount for a user on Twitch, Kick, or YouTube by username',
            usage: 'currency[currencyName, username?, platform?]',
            examples: [
                {
                    usage: 'currency[points]',
                    description: 'Get points balance for the current user'
                },
                {
                    usage: 'currency[points, testuser]',
                    description: 'Get points balance for a specific user'
                },
                {
                    usage: 'currency[points, testuser, kick]',
                    description: 'Get points balance for a specific user on a specific platform'
                }
            ]
        },
        evaluator: async (
            trigger: Trigger,
            currencyName?: string,
            username?: string,
            platform?: string
        ): Promise<number> => {
            // Call the base evaluator with platform as the fourth parameter
            return baseVariable.evaluator(trigger, currencyName, username, platform);
        }
    };
}

/**
 * Creates an override variable for chatMessages
 * Matches Firebot's built-in signature: (trigger, username)
 * But adds optional platform parameter at the end
 */
export function createChatMessagesOverride(
    userDatabase: PlatformUserDatabase,
    logger: LogWrapper
): ReplaceVariable {
    const baseVariable = createPlatformChatMessagesVariable(userDatabase, logger);

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

/**
 * Creates an override variable for userMetadata
 * Matches Firebot's built-in signature: (_, username, key, defaultValue, propertyPath)
 * But adds optional platform parameter at the end
 */
export function createUserMetadataOverride(
    userDatabase: PlatformUserDatabase,
    logger: LogWrapper
): ReplaceVariable {
    const baseVariable = createPlatformUserMetadataVariable(userDatabase, logger);

    return {
        definition: {
            ...baseVariable.definition,
            handle: 'userMetadata',
            description: 'Get the metadata associated with a user across platforms (Twitch, Kick, YouTube)',
            usage: 'userMetadata[username, metadataKey, defaultValue?, propertyPath?, platform?]',
            examples: [
                {
                    usage: 'userMetadata[username, metadataKey]',
                    description: 'Get metadata value for a user'
                },
                {
                    usage: 'userMetadata[username, metadataKey, defaultValue]',
                    description: 'Provide a default value if one does not exist for the user'
                },
                {
                    usage: 'userMetadata[username, metadataKey, null, propertyPath]',
                    description: 'Provide a property path (using dot notation) or array index as a fourth argument'
                },
                {
                    usage: 'userMetadata[username, metadataKey, null, null, kick]',
                    description: 'Explicitly specify the platform (twitch, kick, youtube)'
                }
            ]
        },
        evaluator: async (
            trigger: Trigger,
            username?: string,
            key?: string,
            defaultValue: unknown = null,
            propertyPath: string | null = null,
            platform?: string
        ): Promise<unknown> => {
            // Call the base evaluator with platform as the sixth parameter
            return baseVariable.evaluator(trigger, username, key, defaultValue, propertyPath, platform);
        }
    };
}

/**
 * Creates an override variable for lastSeen
 * Matches Firebot's built-in signature: (trigger, username)
 * But adds optional platform parameter at the end
 */
export function createLastSeenOverride(
    userDatabase: PlatformUserDatabase,
    logger: LogWrapper
): ReplaceVariable {
    const baseVariable = createPlatformLastSeenVariable(userDatabase, logger);

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
