import type { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import { logger, platformLib } from '../main';
import { extractTriggerUserId } from './trigger-helpers';

/**
 * Resolves the platform for an effect by detecting from trigger if needed.
 * @param platform Explicit platform parameter from effect
 * @param username Username for platform detection
 * @param trigger Trigger data for fallback detection
 * @param effectName Name of effect for error logging
 * @returns Detected platform or null if unable to determine
 */
export async function resolvePlatformForEffect(
    platform: string | undefined,
    username: string,
    trigger: Trigger,
    effectName: string
): Promise<string | null> {
    let detectedPlatform = platform;
    if (!detectedPlatform || detectedPlatform === 'auto-detect' || detectedPlatform === 'unknown') {
        const triggerUserId = extractTriggerUserId(trigger);
        detectedPlatform = platformLib.userDatabase.detectPlatform(triggerUserId, username, trigger);
    }

    if (!detectedPlatform || detectedPlatform === 'unknown') {
        logger.error(`${effectName}: Cannot determine platform for user ${username}`);
        return null;
    }

    return detectedPlatform;
}
