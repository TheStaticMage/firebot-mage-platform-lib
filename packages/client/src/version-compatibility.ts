import { checkSemanticVersion } from './semantic-version';

/**
 * Result of a version compatibility check
 */
export interface VersionCheckResult {
    compatible: boolean;
    reason?: string;
}

/**
 * Minimum platform-lib version required for integrations to use platform-aware features
 * Integrations can check against this to determine compatibility
 */
export const PLATFORM_LIB_MIN_VERSION = '0.0.1';

/**
 * Checks version compatibility using semver ranges
 * @param required Required version range (e.g., "^1.0.0", ">=1.2.0 <2.0.0")
 * @param current Current version (e.g., "1.2.3")
 * @returns Result object with compatibility status and optional reason
 */
export function checkVersionCompatibility(
    required: string,
    current: string
): VersionCheckResult {
    if (!required || !current) {
        return {
            compatible: false,
            reason: 'Missing version information'
        };
    }

    // Validate that the current version looks like a valid semver format
    // (must have major.minor.patch pattern)
    const versionPattern = /^\d+\.\d+\.\d+/;
    if (!versionPattern.test(current)) {
        return {
            compatible: false,
            reason: `Invalid current version: ${current}`
        };
    }

    const isCompatible = checkSemanticVersion(current, required);

    if (!isCompatible) {
        return {
            compatible: false,
            reason: `Version ${current} does not satisfy requirement ${required}`
        };
    }

    return { compatible: true };
}
