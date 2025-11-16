import { IntegrationVersionInfo } from './version';

/**
 * Detected integration information
 */
export interface DetectedIntegration {
    /**
     * Platform identifier (e.g., "kick", "youtube")
     */
    platform: string;

    /**
     * Whether the integration is registered with the platform library
     */
    registered: boolean;

    /**
     * Integration version info (if registered)
     */
    versionInfo?: IntegrationVersionInfo;
}

/**
 * Query platforms response
 */
export interface QueryPlatformsResponse {
    /**
     * List of available platform IDs (includes "twitch" by default)
     */
    platforms: string[];
}
