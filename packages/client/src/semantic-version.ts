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
        // If version range is empty, return false
        if (!versionRange || !versionRange.trim()) {
            return false;
        }

        // First try parsing as a clean semver version
        const cleanVersion = semver.clean(currentVersion);
        if (cleanVersion && semver.valid(cleanVersion)) {
            // For custom build versions (e.g., "5.65.4-Mage20251219045649"),
            // semver.satisfies() treats them as pre-release versions with lower priority.
            // However, custom builds should be treated as equivalent to their base version.
            // We detect custom builds by checking if the pre-release identifier starts with
            // a non-standard prefix (not alpha, beta, rc, etc.) followed by digits.
            const parsed = semver.parse(cleanVersion);
            if (parsed && parsed.prerelease.length > 0) {
                const prereleaseStr = parsed.prerelease.join('.');
                // Check if this looks like a custom build (e.g., "Mage20251219045649")
                // rather than a semantic pre-release (e.g., "beta.1", "alpha", "rc.2")
                const isCustomBuild = /^[A-Z][a-z]+\d+/.test(prereleaseStr);
                if (isCustomBuild) {
                    const coercedVersion = semver.coerce(currentVersion);
                    if (coercedVersion) {
                        return semver.satisfies(coercedVersion, versionRange);
                    }
                }
            }
            return semver.satisfies(cleanVersion, versionRange);
        }

        // If that fails, try coercing
        // But only if the version looks like it has all three components (major.minor.patch)
        // This prevents accepting incomplete versions like "5.65" (missing patch)
        const versionPattern = /^\d+\.\d+\.\d+/;
        if (versionPattern.test(currentVersion)) {
            const coercedVersion = semver.coerce(currentVersion);
            if (coercedVersion) {
                return semver.satisfies(coercedVersion, versionRange);
            }
        }

        // If nothing worked, it's incompatible
        return false;
    } catch {
        // If there's any parsing error, consider it incompatible
        return false;
    }
}
