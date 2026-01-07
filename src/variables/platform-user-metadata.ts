import type { ReplaceVariable } from '@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager';
import type { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import { firebot, LogWrapper } from '../main';
import { PlatformUserDatabase } from '../internal/platform-user-database';
import { determineTargetPlatform } from '../internal/trigger-helpers';

/**
 * Creates a platform-aware user metadata variable
 * @param userDatabase Platform user database for lookups
 * @param logger Logger instance
 * @returns ReplaceVariable that gets user metadata across platforms
 */
export function createPlatformUserMetadataVariable(
    userDatabase: PlatformUserDatabase,
    logger: LogWrapper
): ReplaceVariable {
    return {
        definition: {
            handle: 'platformUserMetadata',
            description: 'Get the metadata associated with a user across platforms (Twitch, Kick, YouTube)',
            usage: 'platformUserMetadata[username, metadataKey, defaultValue?, propertyPath?, platform?]',
            examples: [
                {
                    usage: 'platformUserMetadata[username, metadataKey]',
                    description: 'Get metadata value for a user'
                },
                {
                    usage: 'platformUserMetadata[username, metadataKey, defaultValue]',
                    description: 'Provide a default value if one does not exist for the user'
                },
                {
                    usage: 'platformUserMetadata[username, metadataKey, null, propertyPath]',
                    description: 'Provide a property path (using dot notation) or array index as a fourth argument'
                },
                {
                    usage: 'platformUserMetadata[username, metadataKey, null, null, kick]',
                    description: 'Explicitly specify the platform (twitch, kick, youtube)'
                }
            ],
            categories: ['advanced', 'user based'],
            possibleDataOutput: ['number', 'text']
        },
        evaluator: async (
            trigger: Trigger,
            username: string,
            key: string,
            defaultValue: unknown = null,
            propertyPath: string | null = null,
            platform: string | null = null
        ): Promise<unknown> => {
            try {
                if (!username || !key) {
                    logger.debug('platformUserMetadata: Missing username or key');
                    return defaultValue;
                }

                // Determine target platform
                const targetPlatform = determineTargetPlatform(platform, username, trigger);

                if (!targetPlatform || targetPlatform === 'unknown') {
                    logger.debug(`platformUserMetadata: Cannot determine platform for username ${username}`);
                    return defaultValue;
                }

                // Twitch: use Firebot's viewer metadata manager
                if (targetPlatform === 'twitch') {
                    logger.debug(`platformUserMetadata: Getting Twitch metadata for ${username}, key: ${key}`);
                    const viewerMetadataManager = firebot.modules.viewerMetadataManager as {
                        getViewerMetadata: (username: string, key: string, propertyPath: string | null) => Promise<unknown>;
                    };
                    const data = await viewerMetadataManager.getViewerMetadata(username, key, propertyPath);
                    if (data == null) {
                        return defaultValue;
                    }
                    return data;
                }

                // Kick/YouTube: use platform user database metadata if available
                if (targetPlatform === 'kick' || targetPlatform === 'youtube') {
                    logger.debug(`platformUserMetadata: Getting ${targetPlatform} metadata for ${username}, key: ${key}`);
                    const normalizedUsername = userDatabase.normalizeUsername(username);
                    const user = await userDatabase.getUserByUsername(normalizedUsername, targetPlatform);

                    if (!user) {
                        logger.debug(`platformUserMetadata: User not found for ${normalizedUsername}`);
                        return defaultValue;
                    }

                    const metadata = user.metadata || {};
                    const value = metadata[key];

                    if (value == null) {
                        return defaultValue;
                    }

                    // Handle property path if provided
                    if (propertyPath) {
                        try {
                            const parts = propertyPath.split('.');
                            let result: unknown = value;
                            for (const part of parts) {
                                if (result == null) {
                                    return defaultValue;
                                }
                                result = (result as Record<string, unknown>)[part];
                            }
                            return result;
                        } catch (error) {
                            logger.debug(`platformUserMetadata: Error accessing property path ${propertyPath}: ${error}`);
                            return defaultValue;
                        }
                    }

                    return value;
                }

                logger.debug(`platformUserMetadata: Platform ${targetPlatform} not supported for metadata`);
                return defaultValue;
            } catch (error) {
                logger.debug(`platformUserMetadata error: ${error}`);
                return defaultValue;
            }
        }
    };
}
