/**
 * Options for the checkMatch function
 */
export interface CheckMatchOptions {
    /**
     * Whether "unknown" can match when explicitly targeted
     */
    allowUnknownMatch: boolean;
}

/**
 * Checks if the detected platform matches the target platform
 *
 * @param detectedPlatform The platform detected from the trigger
 * @param targetPlatform The platform to compare against
 * @param options Options to control matching behavior
 * @returns True if the platforms match
 */
export function checkMatch(
    detectedPlatform: string,
    targetPlatform: string,
    options: CheckMatchOptions = { allowUnknownMatch: false }
): boolean {
    // "unknown" can only match if explicitly targeting unknown and allowed
    if (detectedPlatform === 'unknown') {
        return options.allowUnknownMatch && targetPlatform === 'unknown';
    }

    // "any" matches any known platform (kick, twitch, youtube)
    if (targetPlatform === 'any') {
        return detectedPlatform === 'kick' || detectedPlatform === 'twitch' || detectedPlatform === 'youtube';
    }

    // Direct comparison
    return detectedPlatform === targetPlatform;
}
