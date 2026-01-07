import type { ReplaceVariable } from '@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager';
import type { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import { PlatformUserDatabase } from '../internal/platform-user-database';
import { createPlatformMetadataEvaluator } from '../internal/variable-helpers';
import { firebot, logger } from '../main';

export function createPlatformUserMetadataVariable(
    userDatabase: PlatformUserDatabase
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
        evaluator: createPlatformMetadataEvaluator({
            userDatabase,
            variableName: 'platformUserMetadata',
            handleTwitch: async (normalizedUsername, key, propertyPath) => {
                const viewerMetadataManager = firebot.modules.viewerMetadataManager as {
                    getViewerMetadata: (username: string, key: string, propertyPath: string | null) => Promise<unknown>;
                };
                return await viewerMetadataManager.getViewerMetadata(normalizedUsername, key, propertyPath);
            },
            handlePlatformDb: async (user, key, propertyPath) => {
                const metadata = user.metadata || {};
                const value = metadata[key];

                if (value == null) {
                    return null;
                }

                if (propertyPath) {
                    try {
                        const parts = propertyPath.split('.');
                        let result: unknown = value;
                        for (const part of parts) {
                            if (result == null) {
                                return null;
                            }
                            result = (result as Record<string, unknown>)[part];
                        }
                        return result;
                    } catch (error) {
                        logger.debug(`platformUserMetadata: Error accessing property path ${propertyPath}: ${error}`);
                        return null;
                    }
                }

                return value;
            }
        })
    };
}

/**
 * Creates an override variable for userMetadata
 * Matches Firebot's built-in signature: (_, username, key, defaultValue, propertyPath)
 * But adds optional platform parameter at the end
 */
export function createUserMetadataOverride(
    userDatabase: PlatformUserDatabase
): ReplaceVariable {
    const baseVariable = createPlatformUserMetadataVariable(userDatabase);

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
