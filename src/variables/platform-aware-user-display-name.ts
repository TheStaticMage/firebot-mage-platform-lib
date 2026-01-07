import { ReplaceVariable } from '@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager';
import { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import { firebot, LogWrapper } from '../main';
import { PlatformUserDatabase } from '../internal/platform-user-database';
import { determineTargetPlatform, normalizeUsername } from '../internal/trigger-helpers';

/**
 * Creates a platform-aware user display name variable
 * @param userDatabase Platform user database for lookups
 * @param logger Logger instance
 * @returns ReplaceVariable that gets user display names across platforms
 */
export function createPlatformAwareUserDisplayNameVariable(
    userDatabase: PlatformUserDatabase,
    logger: LogWrapper
): ReplaceVariable {
    return {
        definition: {
            handle: 'platformAwareUserDisplayName',
            description: 'Gets the platform-aware display name for a user from the detected platform',
            usage: 'platformAwareUserDisplayName[username]',
            examples: [
                {
                    usage: 'platformAwareUserDisplayName',
                    description: 'Returns the display name for the current user from the trigger'
                },
                {
                    usage: 'platformAwareUserDisplayName[testuser]',
                    description: 'Returns the display name for the specified username'
                }
            ],
            categories: ['common', 'user based'],
            possibleDataOutput: ['text'],
            triggers: {
                command: true,
                custom_script: true, // eslint-disable-line camelcase
                event: true,
                manual: true,
                preset: true,
                startup_script: true, // eslint-disable-line camelcase
                api: true,
                quick_action: true, // eslint-disable-line camelcase
                hotkey: true,
                timer: true,
                counter: true,
                channel_reward: true // eslint-disable-line camelcase
            }
        },
        async evaluator(trigger: Trigger, username?: string): Promise<string> {
            // 1. Extract username from trigger or argument
            const targetUsername = username || extractUsernameFromTrigger(trigger);

            // 2. If NO username argument provided, check trigger display name first
            if (!username) {
                const triggerDisplayName = extractDisplayNameFromTrigger(trigger);
                if (triggerDisplayName) {
                    logger.debug(`Using display name from trigger: ${triggerDisplayName}`);
                    return triggerDisplayName;
                }

                // No display name in trigger and no username in trigger
                if (!targetUsername) {
                    logger.debug('No username or display name found in trigger');
                    return '';
                }
            }

            // 3. If username argument WAS provided but is empty/invalid
            if (!targetUsername) {
                logger.debug('No valid username provided');
                return '';
            }

            // 4. Detect platform for database lookup (username suffix takes priority)
            const platform = determineTargetPlatform(undefined, targetUsername, trigger);

            // 5. Platform-specific database lookup
            try {
                if (platform === 'twitch') {
                    let normalizedTwitchUsername: string;
                    try {
                        normalizedTwitchUsername = normalizeUsername(targetUsername);
                    } catch (error) {
                        logger.debug(`Invalid Twitch username: ${error}`);
                        return '';
                    }
                    logger.debug(`Getting Twitch display name for ${normalizedTwitchUsername}`);
                    const viewer = await firebot.modules.viewerDatabase.getViewerByUsername(normalizedTwitchUsername);
                    return viewer?.displayName || normalizedTwitchUsername;
                }
                if (platform === 'kick' || platform === 'youtube') {
                    logger.debug(`Getting ${platform} display name for ${targetUsername}`);
                    const normalized = normalizeUsername(targetUsername);
                    const user = await userDatabase.getUserByUsername(normalized, platform);

                    if (user?.displayName) {
                        logger.debug(`Found ${platform} display name: ${user.displayName}`);
                        return user.displayName;
                    }

                    logger.debug(`No display name found for ${targetUsername}, using stripped username`);
                    return stripUsernameDecorations(targetUsername);
                }
                // Unknown platform - return stripped username
                logger.debug('Unknown platform, returning stripped username');
                return stripUsernameDecorations(targetUsername);
            } catch (error) {
                logger.debug(`Failed to get display name from ${platform}: ${error}, using stripped username`);
                if (platform === 'twitch') {
                    try {
                        return normalizeUsername(targetUsername);
                    } catch (normalizedError) {
                        logger.debug(`Invalid Twitch username: ${normalizedError}`);
                        return '';
                    }
                }
                return stripUsernameDecorations(targetUsername);
            }
        }
    };
}

/**
 * Extracts username from trigger metadata
 */
function extractUsernameFromTrigger(trigger: Trigger): string | null {
    const metadata = trigger.metadata as Record<string, unknown>;
    if (!metadata) {
        return null;
    }

    // Priority 1: Chat message username
    const chatMessage = metadata.chatMessage as Record<string, unknown>;
    if (chatMessage && typeof chatMessage.username === 'string') {
        return chatMessage.username;
    }

    // Priority 2: Event data username
    const eventData = metadata.eventData as Record<string, unknown>;
    if (eventData && typeof eventData.username === 'string') {
        return eventData.username;
    }

    // Priority 3: Top-level metadata username
    if (typeof metadata.username === 'string') {
        return metadata.username;
    }

    return null;
}

/**
 * Extracts display name fallback from trigger metadata
 */
function extractDisplayNameFromTrigger(trigger: Trigger): string | null {
    const metadata = trigger.metadata as Record<string, unknown>;
    if (!metadata) {
        return null;
    }

    // Priority 1: Chat message display name
    const chatMessage = metadata.chatMessage as Record<string, unknown>;
    if (chatMessage && typeof chatMessage.displayName === 'string') {
        return chatMessage.displayName;
    }

    // Priority 2: Event data display name
    const eventData = metadata.eventData as Record<string, unknown>;
    if (eventData && typeof eventData.displayName === 'string') {
        return eventData.displayName;
    }

    return null;
}

/**
 * Strips @ prefix and platform suffix while preserving capitalization
 */
function stripUsernameDecorations(username: string): string {
    let stripped = username;

    // Remove platform suffix (case-insensitive check, but preserve original case)
    if (stripped.toLowerCase().endsWith('@kick')) {
        stripped = stripped.slice(0, -5);
    } else if (stripped.toLowerCase().endsWith('@youtube')) {
        stripped = stripped.slice(0, -8);
    }

    // Remove leading @
    if (stripped.startsWith('@')) {
        stripped = stripped.slice(1);
    }

    return stripped || username;
}
