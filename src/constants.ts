import type { IntegrationMapping } from "./integration-detector";

export const IntegrationConstants = {
    INTEGRATION_ID: "mage-platform-lib",
    INTEGRATION_NAME: "mage-platform-lib",
    INTEGRATION_URI: "mage-platform-lib"
} as const;

/**
 * Known platform integrations
 */
export const KNOWN_INTEGRATIONS: IntegrationMapping[] = [
    {
        platformId: 'kick',
        manifestName: 'Kick Integration',
        scriptId: 'firebot-mage-kick-integration',
        semverRange: '>= 0.11.0',
        uri: 'firebot-mage-kick-integration'
    },
    {
        platformId: 'youtube',
        manifestName: 'YouTube Integration',
        scriptId: 'firebot-mage-youtube-integration',
        semverRange: '>= 0.0.5',
        uri: 'firebot-mage-youtube-integration'
    }
];
