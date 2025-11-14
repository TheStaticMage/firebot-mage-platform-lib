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
 * Registration request
 */
export interface RegistrationRequest {
    /**
     * Integration version and capability information
     */
    integration: IntegrationVersionInfo;
}

/**
 * Registration response
 */
export interface RegistrationResponse {
    /**
     * Whether registration was successful
     */
    success: boolean;

    /**
     * Error message if registration failed
     */
    error?: string;

    /**
     * Missing required operations (if any)
     */
    missingOperations?: string[];
}

/**
 * Deregistration request
 */
export interface DeregistrationRequest {
    /**
     * Platform ID to deregister
     */
    integrationId: string;
}

/**
 * Deregistration response
 */
export interface DeregistrationResponse {
    /**
     * Whether deregistration was successful
     */
    success: boolean;
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
