import * as semver from 'semver';
import { ScriptModules } from '@crowbartools/firebot-custom-scripts-types/types';
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
}

/**
 * Known platform integrations
 */
const KNOWN_INTEGRATIONS: IntegrationMapping[] = [
    {
        platformId: 'kick',
        manifestName: 'Kick Integration',
        scriptId: 'firebot-mage-kick-integration'
    },
    {
        platformId: 'youtube',
        manifestName: 'YouTube Integration',
        scriptId: 'firebot-mage-youtube-integration'
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

        try {
            const scripts = await this.modules.frontendCommunicator.fireEventAsync<ScriptManifest[]>('getStartupScripts', null);

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
     * Validates semver compatibility between required and current versions
     * @param required Required version (semver range, e.g., "^1.0.0")
     * @param current Current version (e.g., "1.2.3")
     * @returns true if current satisfies required
     */
    static isVersionCompatible(required: string, current: string): boolean {
        try {
            return semver.satisfies(current, required);
        } catch {
            return false;
        }
    }

    /**
     * Clears detected integrations (for testing)
     */
    clear(): void {
        this.detectedIntegrations.clear();
    }
}
