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
 * Kick user IDs are numeric strings, YouTube IDs start with UC, Twitch IDs are numeric
 */
function detectFromUserId(userId: string): string | null {
    if (!userId) {
        return null;
    }

    // YouTube channel IDs typically start with UC
    if (userId.startsWith('UC') && userId.length >= 20) {
        return 'youtube';
    }

    // For numeric IDs, we can't reliably distinguish between Kick and Twitch
    // so we return null to fall through to other detection methods
    return null;
}

/**
 * Detect platform from username patterns
 * This is a heuristic and may not be 100% accurate
 */
function detectFromUsername(username: string): string | null {
    if (!username) {
        return null;
    }

    // YouTube usernames often contain @ or have specific patterns
    // This is a weak heuristic, so we'll only use it as a last resort
    // For now, return null to indicate we can't determine from username alone
    return null;
}

/**
 * Normalize platform string to lowercase standard format
 */
function normalizePlatform(platform: string): string {
    const normalized = platform.toLowerCase().trim();

    // Map common variations
    if (normalized === 'twitch' || normalized === 'twitchtv') {
        return 'twitch';
    }
    if (normalized === 'kick') {
        return 'kick';
    }
    if (normalized === 'youtube' || normalized === 'yt') {
        return 'youtube';
    }

    return normalized;
}
