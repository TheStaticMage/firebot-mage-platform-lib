import * as semver from 'semver';

/**
 * Checks if a version satisfies a given semver requirement
 *
 * This is a generic semantic versioning checker that can be used for any version comparison.
 * Common use case: validating Firebot version requirements.
 *
 * @param currentVersion Current version (e.g., "5.65.0")
 * @param versionRange Semver version range (e.g., ">= 5.65.0", "^5.65.0", "5.65.0 - 6.0.0")
 * @returns true if current version satisfies the range, false otherwise
 *
 * @example
 * const isCompatible = checkSemanticVersion(runRequest.firebot.version, ">= 5.65.0");
 * if (!isCompatible) {
 *     logger.warn("Firebot 5.65.0 or higher is required");
 * }
 */
export function checkSemanticVersion(currentVersion: string, versionRange: string): boolean {
    try {
        // Clean and normalize the current version
        const current = semver.clean(currentVersion);

        // If current version is invalid, return false
        if (!current) {
            return false;
        }

        // If version range is empty, return false
        if (!versionRange || !versionRange.trim()) {
            return false;
        }

        // Check if current version satisfies the range
        return semver.satisfies(current, versionRange);
    } catch {
        // If there's any parsing error, consider it incompatible
        return false;
    }
}
