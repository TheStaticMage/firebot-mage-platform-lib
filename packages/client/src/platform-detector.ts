import { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';

/**
 * Detects the platform from trigger metadata using a hierarchical strategy
 * @param trigger The trigger object from Firebot
 * @returns Platform ID ("twitch", "kick", "youtube", "unknown")
 */
export function detectPlatform(trigger: Trigger): string {
    if (!trigger) {
        return 'unknown';
    }

    // 1. Check explicit platform in metadata.eventData.platform or metadata.platform
    const explicitPlatform = checkExplicitPlatform(trigger);
    if (explicitPlatform) {
        return explicitPlatform;
    }

    // 2. Check eventSource.id
    const eventSourcePlatform = checkEventSource(trigger);
    if (eventSourcePlatform) {
        return eventSourcePlatform;
    }

    // 3. Check chat message user ID/username patterns
    const chatMessagePlatform = checkChatMessage(trigger);
    if (chatMessagePlatform) {
        return chatMessagePlatform;
    }

    // 4. Check event data user ID/username patterns
    const eventDataPlatform = checkEventData(trigger);
    if (eventDataPlatform) {
        return eventDataPlatform;
    }

    // 5. Check top-level metadata username patterns
    const metadataPlatform = checkMetadata(trigger);
    if (metadataPlatform) {
        return metadataPlatform;
    }

    // 6. Fallback to unknown
    return 'unknown';
}

/**
 * Check for explicit platform declaration in metadata
 */
function checkExplicitPlatform(trigger: Trigger): string | null {
    const metadata = trigger.metadata as Record<string, unknown>;
    if (!metadata) {
        return null;
    }

    // Check metadata.platform
    if (typeof metadata.platform === 'string') {
        return normalizePlatform(metadata.platform);
    }

    // Check metadata.eventData.platform
    const eventData = metadata.eventData as Record<string, unknown>;
    if (eventData && typeof eventData.platform === 'string') {
        return normalizePlatform(eventData.platform);
    }

    return null;
}

/**
 * Check eventSource.id for platform information
 */
function checkEventSource(trigger: Trigger): string | null {
    const eventSource = trigger.metadata?.eventSource as Record<string, unknown>;
    if (eventSource && typeof eventSource.id === 'string') {
        // Try to map integration ID to platform
        const mapped = mapIntegrationIdToPlatform(eventSource.id);
        if (mapped) {
            return mapped;
        }
        // Fall back to normalizing the ID as-is
        return normalizePlatform(eventSource.id);
    }
    return null;
}

/**
 * Check chat message for platform-specific patterns
 */
function checkChatMessage(trigger: Trigger): string | null {
    const metadata = trigger.metadata as Record<string, unknown>;
    const chatMessage = metadata?.chatMessage as Record<string, unknown>;

    if (!chatMessage) {
        return null;
    }

    // Check userId patterns
    if (typeof chatMessage.userId === 'string') {
        const platform = detectFromUserId(chatMessage.userId);
        if (platform) {
            return platform;
        }
    }

    // Check username patterns
    if (typeof chatMessage.username === 'string') {
        const platform = detectFromUsername(chatMessage.username);
        if (platform) {
            return platform;
        }
    }

    return null;
}

/**
 * Check event data for platform-specific patterns
 */
function checkEventData(trigger: Trigger): string | null {
    const metadata = trigger.metadata as Record<string, unknown>;
    const eventData = metadata?.eventData as Record<string, unknown>;

    if (!eventData) {
        return null;
    }

    // Check userId patterns
    if (typeof eventData.userId === 'string') {
        const platform = detectFromUserId(eventData.userId);
        if (platform) {
            return platform;
        }
    }

    // Check username patterns
    if (typeof eventData.username === 'string') {
        const platform = detectFromUsername(eventData.username);
        if (platform) {
            return platform;
        }
    }

    return null;
}

/**
 * Check top-level metadata for platform-specific patterns
 */
function checkMetadata(trigger: Trigger): string | null {
    const metadata = trigger.metadata as Record<string, unknown>;

    if (!metadata) {
        return null;
    }

    // Check username at metadata level
    if (typeof metadata.username === 'string') {
        const platform = detectFromUsername(metadata.username);
        if (platform) {
            return platform;
        }
    }

    // Check user object
    const user = metadata.user as Record<string, unknown>;
    if (user) {
        if (typeof user.id === 'string') {
            const platform = detectFromUserId(user.id);
            if (platform) {
                return platform;
            }
        }

        if (typeof user.username === 'string') {
            const platform = detectFromUsername(user.username);
            if (platform) {
                return platform;
            }
        }
    }

    return null;
}

/**
 * Detect platform from user ID patterns
 * - Twitch user IDs are numeric
 * - Kick user IDs start with 'k' plus the numeric ID from Kick
 * - YouTube user IDs start with 'y' plus the ID from YouTube
 * - Non-matching patterns default to Twitch
 */
function detectFromUserId(userId: string): string {
    if (!userId) {
        return null as unknown as string;
    }

    // Kick user IDs start with 'k'
    if (userId.startsWith('k') && userId.length > 1) {
        return 'kick';
    }

    // YouTube user IDs start with 'y'
    if (userId.startsWith('y') && userId.length > 1) {
        return 'youtube';
    }

    // Numeric IDs are Twitch
    if (/^\d+$/.test(userId)) {
        return 'twitch';
    }

    // Non-matching userId pattern: assume Twitch
    return 'twitch';
}

/**
 * Detect platform from username patterns
 * - Kick usernames end with '@kick'
 * - YouTube usernames end with '@youtube'
 * - Other usernames default to Twitch
 */
function detectFromUsername(username: string): string {
    if (!username) {
        return null as unknown as string;
    }

    // Kick usernames end with '@kick'
    if (username.endsWith('@kick')) {
        return 'kick';
    }

    // YouTube usernames end with '@youtube'
    if (username.endsWith('@youtube')) {
        return 'youtube';
    }

    // Fallback: any other username is assumed to be Twitch
    return 'twitch';
}

/**
 * Map integration IDs/URIs to platform short names
 */
function mapIntegrationIdToPlatform(integrationId: string): string | null {
    const mapping: Record<string, string> = {
        'mage-kick-integration': 'kick',
        'mage-youtube-integration': 'youtube',
        'twitch': 'twitch'
    };
    return mapping[integrationId.toLowerCase()] || null;
}

/**
 * Normalize platform string to lowercase standard format
 * Preserves case for unknown platforms, only normalizes known ones
 */
function normalizePlatform(platform: string): string {
    const trimmed = platform.trim();
    const lower = trimmed.toLowerCase();

    // Only lowercase explicitly recognized platforms
    if (lower === 'twitch' || lower === 'twitchtv') {
        return 'twitch';
    }
    if (lower === 'kick') {
        return 'kick';
    }
    if (lower === 'youtube' || lower === 'yt') {
        return 'youtube';
    }

    // Preserve case for unknown platforms
    return trimmed;
}
