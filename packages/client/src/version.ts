/**
 * Platform Library Version
 */
export const PLATFORM_LIB_VERSION = "0.0.3";

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

/**
 * Standard platform operations supported by the platform library
 */
export const SUPPORTED_OPERATIONS = [
    'send-chat-message',
    'get-user-display-name'
] as const;

/**
 * Creates platform library version info object
 * @returns Version info for the platform library
 */
export function createPlatformLibVersionInfo(): PlatformLibVersionInfo {
    return {
        version: PLATFORM_LIB_VERSION,
        loaded: true
    };
}

/**
 * Helper to create integration version info
 * @param config Configuration for the integration
 * @returns IntegrationVersionInfo object
 */
export function createIntegrationVersionInfo(config: {
    integrationId: string;
    integrationName: string;
    platformLibVersion: string;
    supportedOperations: string[];
}): IntegrationVersionInfo {
    return {
        integrationId: config.integrationId,
        integrationName: config.integrationName,
        platformLibVersion: config.platformLibVersion,
        supportedOperations: config.supportedOperations
    };
}
