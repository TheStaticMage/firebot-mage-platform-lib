import { ReplaceVariable } from '@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager';
import { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import { GetUserDisplayNameRequest, GetUserDisplayNameResponse, detectPlatform } from '@thestaticmage/mage-platform-lib-client';
import { PlatformDispatcher } from '../platform-dispatcher';
import { LogWrapper } from '../main';

/**
 * Creates a platform-aware user display name variable
 * @param platformDispatcher Platform dispatcher for routing requests
 * @param logger Logger instance
 * @returns ReplaceVariable that gets user display names across platforms
 */
export function createPlatformAwareUserDisplayNameVariable(
    platformDispatcher: PlatformDispatcher,
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
            // 1. Determine the target username
            const targetUsername = username || extractUsernameFromTrigger(trigger);
            if (!targetUsername) {
                logger.debug('No username found in trigger or arguments');
                return 'unknown';
            }

            // 2. Get fallback display name from trigger metadata
            const fallbackDisplayName = extractDisplayNameFromTrigger(trigger);

            // 3. Detect the platform
            const platform = detectPlatform(trigger);

            // 4. If platform is unknown, use fallback
            if (platform === 'unknown') {
                logger.debug('Unknown platform, using fallback display name');
                return fallbackDisplayName || targetUsername;
            }

            // 5. Try to get display name from the platform
            try {
                logger.debug(`Getting display name for ${targetUsername} from ${platform}`);
                const response = await platformDispatcher.dispatchOperation<
                    GetUserDisplayNameRequest,
                    GetUserDisplayNameResponse
                >(
                    'get-user-display-name',
                    platform,
                    { username: targetUsername }
                );

                if (response.displayName) {
                    logger.debug(`Got display name from ${platform}: ${response.displayName}`);
                    return response.displayName;
                }

                logger.debug(`No display name returned from ${platform}, using fallback`);
                return fallbackDisplayName || targetUsername;
            } catch (error) {
                logger.debug(`Failed to get display name from ${platform}: ${error}, using fallback`);
                return fallbackDisplayName || targetUsername;
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
