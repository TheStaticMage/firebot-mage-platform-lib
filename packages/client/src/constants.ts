/**
 * Integration and operation constants for platform library
 */

/**
 * Operation names for platform operations
 */
export const OPERATIONS = {
    SEND_CHAT_MESSAGE: 'send-chat-message'
} as const;

/**
 * Platform identifiers
 */
export const PLATFORMS = {
    TWITCH: 'twitch',
    KICK: 'kick',
    YOUTUBE: 'youtube'
} as const;

/**
 * Integration identifiers (script registration prefixes)
 */
export const INTEGRATIONS = {
    PLATFORM_LIB: 'mage-platform-lib',
    KICK: 'firebot-mage-kick-integration',
    YOUTUBE: 'mage-youtube-integration'
} as const;

/**
 * Maps platform IDs to integration IDs
 */
export const PLATFORM_TO_INTEGRATION: Record<string, string> = {
    [PLATFORMS.KICK]: INTEGRATIONS.KICK,
    [PLATFORMS.YOUTUBE]: INTEGRATIONS.YOUTUBE
} as const;

/**
 * Default Firebot web server port
 */
export const DEFAULT_WEB_SERVER_PORT = 7472;

/**
 * Operation-specific timeouts (in milliseconds)
 */
export const OPERATION_TIMEOUTS: Record<string, number> = {
    [OPERATIONS.SEND_CHAT_MESSAGE]: 5000
} as const;

/**
 * Operation-specific retry counts
 */
export const OPERATION_RETRIES: Record<string, number> = {
    [OPERATIONS.SEND_CHAT_MESSAGE]: 1
} as const;
