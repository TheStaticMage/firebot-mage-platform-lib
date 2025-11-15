import { ScriptModules } from '@crowbartools/firebot-custom-scripts-types/types';
import { checkVersionCompatibility, VersionCheckResult } from '@mage-platform-lib/types';
import { LogWrapper } from './main';

/**
 * Detected integration metadata
 */
interface DetectedIntegrationInfo {
    scriptName: string;
    version?: string;
    scriptId?: string;
}

/**
 * Script manifest from Firebot
 */
interface ScriptManifest {
    name: string;
    version?: string;
    id?: string;
}

/**
 * Integration metadata for known platforms
 */
interface IntegrationMapping {
    platformId: string;
    manifestName: string;
    scriptId: string;
    semverRange: string;
}

/**
 * Known platform integrations
 */
const KNOWN_INTEGRATIONS: IntegrationMapping[] = [
    {
        platformId: 'kick',
        manifestName: 'Kick Integration',
        scriptId: 'firebot-mage-kick-integration',
        semverRange: '>= 0.7.0'
    },
    {
        platformId: 'youtube',
        manifestName: 'YouTube Integration',
        scriptId: 'firebot-mage-youtube-integration',
        semverRange: '>= 0.0.1'
    }
];

/**
 * Detects and manages platform integrations
 */
export class IntegrationDetector {
    private detectedIntegrations = new Map<string, DetectedIntegrationInfo>();
    private modules: ScriptModules;
    private logger: LogWrapper;

    constructor(modules: ScriptModules, logger: LogWrapper) {
        this.modules = modules;
        this.logger = logger;
    }

    /**
     * Scans Firebot's startup scripts to detect installed integrations
     */
    async detectInstalledIntegrations(): Promise<void> {
        this.logger.debug('Scanning for installed integrations...');
        const { frontendCommunicator } = this.modules;

        try {
            const scripts = await frontendCommunicator.fireEventAsync<ScriptManifest[]>('getStartupScripts', null);

            if (!scripts || !Array.isArray(scripts)) {
                this.logger.warn('No startup scripts returned from Firebot');
                return;
            }

            this.logger.debug(`Found ${scripts.length} startup scripts`);

            for (const script of scripts) {
                const platformId = this.identifyIntegration(script);
                if (platformId) {
                    this.detectedIntegrations.set(platformId, {
                        scriptName: script.name,
                        version: script.version,
                        scriptId: script.id
                    });
                    this.logger.info(`Detected ${platformId} integration (version: ${script.version || 'unknown'})`);
                }
            }

            this.logger.debug(`Detected ${this.detectedIntegrations.size} platform integrations`);
        } catch (error) {
            this.logger.error(`Failed to detect integrations: ${error}`);
        }
    }

    /**
     * Identifies an integration from script manifest
     * @param script Script manifest data
     * @returns Platform ID if recognized, null otherwise
     */
    identifyIntegration(script: ScriptManifest): string | null {
        if (!script || !script.name) {
            return null;
        }

        // Check against known integrations
        for (const integration of KNOWN_INTEGRATIONS) {
            // Match by manifest name
            if (script.name === integration.manifestName) {
                return integration.platformId;
            }

            // Match by script ID if available
            if (script.id && script.id === integration.scriptId) {
                return integration.platformId;
            }
        }

        return null;
    }

    /**
     * Checks if a platform integration was detected
     */
    isIntegrationDetected(platform: string): boolean {
        return this.detectedIntegrations.has(platform);
    }

    /**
     * Returns list of available platforms (always includes "twitch")
     */
    getAvailablePlatforms(): string[] {
        const platforms = ['twitch']; // Twitch is always available
        for (const [platformId] of this.detectedIntegrations) {
            platforms.push(platformId);
        }
        return platforms;
    }

    /**
     * Gets metadata about a detected integration
     */
    getDetectedIntegrationInfo(platform: string): DetectedIntegrationInfo | null {
        return this.detectedIntegrations.get(platform) || null;
    }

    /**
     * Checks compatibility of a detected integration against required version
     * @param platform Platform ID to check
     * @param requiredVersion Required version range (e.g., "^0.6.0")
     * @returns Version check result with compatibility status
     */
    checkIntegrationCompatibility(platform: string, requiredVersion: string): VersionCheckResult {
        const info = this.getDetectedIntegrationInfo(platform);

        if (!info) {
            return {
                compatible: false,
                reason: `Integration ${platform} not detected`
            };
        }

        if (!info.version) {
            return {
                compatible: false,
                reason: `Integration ${platform} has no version information`
            };
        }

        const result = checkVersionCompatibility(requiredVersion, info.version);

        if (!result.compatible) {
            this.logger.warn(
                `Integration ${platform} version ${info.version} is incompatible: ${result.reason}`
            );
        }

        return result;
    }

    /**
     * Clears detected integrations (for testing)
     */
    clear(): void {
        this.detectedIntegrations.clear();
    }
}
