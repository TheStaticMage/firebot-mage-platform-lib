import type { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import { detectPlatform } from '@thestaticmage/mage-platform-lib-client';
import { logger } from '../main';

/**
 * Detect a platform using ID prefix, username suffix, or trigger metadata.
 * @param userId Platform-prefixed user ID if available.
 * @param username Username that may include a platform suffix.
 * @param trigger Trigger metadata for fallback detection.
 * @returns Detected platform or "unknown".
 */
export function detectPlatformFromInputs(
    userId?: string,
    username?: string,
    trigger?: Trigger
): string {
    if (userId) {
        const trimmedUserId = userId.trim();
        if (/^\d+$/.test(trimmedUserId)) {
            return 'twitch';
        }
        if (trimmedUserId.startsWith('k')) {
            return 'kick';
        }
        if (trimmedUserId.startsWith('y')) {
            return 'youtube';
        }
    }

    if (username) {
        const trimmedUsername = username.trim();
        if (trimmedUsername !== '' && !trimmedUsername.includes('@')) {
            return 'twitch';
        }
        const lowerUsername = trimmedUsername.toLowerCase();
        if (lowerUsername.endsWith('@twitch')) {
            return 'twitch';
        }
        if (lowerUsername.endsWith('@kick')) {
            return 'kick';
        }
        if (lowerUsername.endsWith('@youtube')) {
            return 'youtube';
        }
    }

    if (trigger) {
        const platform = detectPlatform(trigger);
        if (platform && platform !== 'unknown') {
            return platform;
        }
    }

    return 'unknown';
}

/**
 * Determines the target platform for a user lookup, prioritizing username suffix over trigger platform.
 * @param explicitPlatform Explicit platform parameter if provided
 * @param username Username to check for platform suffix
 * @param trigger Trigger object for fallback platform detection
 * @returns The detected platform or 'unknown' if not determinable
 */
export function determineTargetPlatform(
    explicitPlatform: string | null | undefined,
    username: string | undefined,
    trigger: Trigger | undefined
): string {
    // Use explicit platform if provided and is a valid platform (not 'unknown')
    if (explicitPlatform && explicitPlatform !== 'unknown' && explicitPlatform !== '') {
        return explicitPlatform;
    }

    // If username is provided, try to detect platform from username suffix first
    if (username) {
        const platformFromUsername = detectPlatformFromInputs(undefined, username, trigger);
        if (platformFromUsername && platformFromUsername !== 'unknown') {
            return platformFromUsername;
        }
    }

    // Fall back to trigger platform
    if (trigger) {
        const platformFromTrigger = detectPlatform(trigger);
        if (platformFromTrigger && platformFromTrigger !== 'unknown') {
            return platformFromTrigger;
        }
    }

    // Default to 'unknown' if no platform could be determined
    return 'unknown';
}

/**
 * Extracts user ID from trigger metadata
 * @param trigger Trigger object to extract user ID from
 * @returns User ID from trigger metadata or undefined if not found
 */
export function extractTriggerUserId(trigger: Trigger | undefined): string | undefined {
    const metadata = trigger?.metadata as Record<string, unknown> | undefined;
    const chatMessage = metadata?.chatMessage as Record<string, unknown> | undefined;
    const eventData = metadata?.eventData as Record<string, unknown> | undefined;
    const user = metadata?.user as Record<string, unknown> | undefined;

    const chatUserId = typeof chatMessage?.userId === 'string' ? chatMessage.userId : undefined;
    const eventUserId = typeof eventData?.userId === 'string' ? eventData.userId : undefined;
    const metadataUserId = typeof user?.id === 'string' ? user.id : undefined;

    return chatUserId || eventUserId || metadataUserId;
}

/**
 * Extracts username from trigger metadata
 * @param trigger Trigger object to extract username from
 * @returns Username from trigger metadata or null if not found
 */
export function extractTriggerUsername(trigger: Trigger): string | null {
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
 * Normalize a username by stripping platform suffixes and leading @.
 * @param username Raw username input.
 * @returns Normalized username.
 * @throws Error when normalization results in empty value.
 */
export function normalizeUsername(username: string): string {
    let normalized = username.trim().toLowerCase();

    if (normalized.endsWith('@kick')) {
        normalized = normalized.slice(0, -5);
    } else if (normalized.endsWith('@youtube')) {
        normalized = normalized.slice(0, -8);
    } else if (normalized.endsWith('@twitch')) {
        normalized = normalized.slice(0, -7);
    }

    if (normalized.startsWith('@')) {
        normalized = normalized.slice(1);
    }

    if (normalized.trim() === '') {
        logger.warn(`Username normalizes to empty string: "${username}"`);
        return username;
    }

    return normalized;
}
