import { ScriptModules } from '@crowbartools/firebot-custom-scripts-types/types';
import { checkVersionCompatibility, VersionCheckResult, loadScriptVersion, getStartupScripts, ScriptManifest } from '@thestaticmage/mage-platform-lib-client';
import { KNOWN_INTEGRATIONS } from './constants';
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
 * Integration metadata for known platforms
 */
export interface IntegrationMapping {
    platformId: string;
    manifestName: string;
    scriptId: string;
    semverRange: string;
    uri: string;
}

/**
 * Detects and manages platform integrations
 */
export class IntegrationDetector {
    private detectedIntegrations = new Map<string, DetectedIntegrationInfo>();
    private logger: LogWrapper;
    private modules?: ScriptModules;
    private scriptDataDir?: string;

    constructor(logger: LogWrapper, modules?: ScriptModules, scriptDataDir?: string) {
        this.logger = logger;
        this.modules = modules;
        this.scriptDataDir = scriptDataDir;
    }

    /**
     * Scans Firebot's startup scripts to detect installed integrations
     */
    async detectInstalledIntegrations(): Promise<void> {
        try {
            this.logger.debug('Retrieving startup scripts...');

            if (!this.modules) {
                this.logger.error('ScriptModules not available for integration detection');
                return;
            }

            const scripts = await getStartupScripts(this.modules, this.logger);

            if (!scripts || scripts.length === 0) {
                this.logger.warn('No startup scripts returned from Firebot');
                return;
            }

            this.logger.debug(`Found ${scripts.length} startup scripts`);

            for (const script of scripts) {
                const platformId = this.identifyIntegration(script);
                if (platformId) {
                    // Load the script's version from the script file
                    this.logger.debug(`Loading version for detected integration: ${platformId}`);
                    let version: string | undefined;
                    if (script.scriptName) {
                        version = this.loadScriptVersion(script.scriptName);
                    }

                    this.detectedIntegrations.set(platformId, {
                        scriptName: script.name,
                        version,
                        scriptId: script.id
                    });
                    this.logger.info(`Detected ${platformId} integration (version: ${version || 'unknown'})`);
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
     * Loads a script's manifest and extracts version information from bundled integration scripts.
     *
     * Uses the reusable loadScriptVersion utility from the client library.
     *
     * @param scriptName Name of the script file
     * @returns Version string or undefined if not found
     */
    private loadScriptVersion(scriptName: string): string | undefined {
        return loadScriptVersion(scriptName, this.scriptDataDir, this.modules, this.logger);
    }

    /**
     * Clears detected integrations (for testing)
     */
    clear(): void {
        this.detectedIntegrations.clear();
    }
}
