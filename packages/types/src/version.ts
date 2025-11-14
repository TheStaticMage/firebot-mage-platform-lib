/**
 * Platform Library Version
 */
export const PLATFORM_LIB_VERSION = "1.0.0";

/**
 * Platform Library version information
 */
export interface PlatformLibVersionInfo {
    version: string;
    loaded: boolean;
}

/**
 * Integration version and capability information
 */
export interface IntegrationVersionInfo {
    /**
     * Unique identifier for the platform (e.g., "kick", "youtube")
     */
    integrationId: string;

    /**
     * IPC event name prefix for the integration (e.g., "mage-kick-integration")
     */
    integrationName: string;

    /**
     * Required Platform Library version (semver notation, e.g., "^1.0.0")
     */
    platformLibVersion: string;

    /**
     * List of operations supported by this integration
     */
    supportedOperations: string[];
}
