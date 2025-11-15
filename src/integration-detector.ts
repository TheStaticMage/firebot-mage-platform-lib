import { ScriptModules } from '@crowbartools/firebot-custom-scripts-types/types';
import { checkVersionCompatibility, VersionCheckResult } from '@mage-platform-lib/client';
import { KNOWN_INTEGRATIONS } from './constants';
import { LogWrapper } from './main';
import { reflectEvent } from './reflector';

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
    scriptName?: string;
}

/**
 * Integration metadata for known platforms
 */
export interface IntegrationMapping {
    platformId: string;
    manifestName: string;
    scriptId: string;
    semverRange: string;
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
            const response = await reflectEvent<any>('getStartupScripts', null, true);

            // Handle both array and object responses
            let scripts: ScriptManifest[] = [];
            if (Array.isArray(response)) {
                scripts = response;
            } else if (response && typeof response === 'object') {
                // Convert object with script IDs as keys to array of scripts
                scripts = Object.values(response);
            }

            if (!scripts || scripts.length === 0) {
                this.logger.warn('No startup scripts returned from Firebot');
                return;
            }

            this.logger.debug(`Found ${scripts.length} startup scripts`);

            for (const script of scripts) {
                const platformId = this.identifyIntegration(script);
                if (platformId) {
                    // Try to load the script's manifest to get version info
                    this.logger.debug(`Loading manifest for detected integration: ${platformId}`);
                    let version = script.version;
                    if (!version && script.scriptName) {
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
     * IMPLEMENTATION NOTE: This method uses eval() to execute bundled webpack scripts because Firebot
     * does not expose:
     * 1. A public API to query installed script metadata (versions, manifests) without going through IPC
     * 2. The script manifest data within the startup script response objects
     * 3. Access to the actual script files to call getScriptManifest() directly via require()
     *
     * As a result, we must:
     * - Manually construct file paths from scriptDataDir (a private RunRequest field)
     * - Read bundled script files from disk ourselves
     * - Use eval() to execute the webpack bundle and extract the exports
     * - Call getScriptManifest() directly on the resulting module
     *
     * This workaround would be unnecessary if Firebot's startup script handler returned the version
     * info in the response, or if there was a public ScriptManager.getScriptManifest(scriptName) method.
     *
     * @param scriptName Name of the script file
     * @returns Version string or undefined if not found
     */
    private loadScriptVersion(scriptName: string): string | undefined {
        if (!this.scriptDataDir || !this.modules?.path || !this.modules?.fs) {
            return undefined;
        }

        try {
            const pathModule = this.modules.path;
            const fsModule = this.modules.fs;

            // Construct full script path from scriptDataDir
            // scriptDataDir is at {profile}/script-data/{script-name}/
            // scripts folder is at {profile}/scripts/
            const scriptsFolder = pathModule.resolve(this.scriptDataDir, '../../scripts');
            const scriptPath = pathModule.join(scriptsFolder, scriptName);

            this.logger.debug(`Script path resolution: scriptDataDir=${this.scriptDataDir}, scriptsFolder=${scriptsFolder}, scriptPath=${scriptPath}`);

            // For bundled webpack scripts, read the file and eval it to get the actual exports
            if (fsModule.existsSync(scriptPath) && fsModule.readFileSync) {
                const fileContent = fsModule.readFileSync(scriptPath, 'utf8');

                // Create a context object to capture the module exports
                const moduleContext = { exports: {} };

                // Execute the bundled code with access to the module context
                // The bundled webpack code will populate module.exports with the script's exports
                // eslint-disable-next-line no-eval
                eval(`(function(module) { ${fileContent} })(moduleContext);`);

                // Try to get the manifest from the evaluated module exports
                const evaledModule = moduleContext.exports as any;
                if (evaledModule && typeof evaledModule.getScriptManifest === 'function') {
                    const manifest = evaledModule.getScriptManifest();
                    if (manifest && typeof manifest === 'object' && manifest.version) {
                        this.logger.debug(`Extracted version from eval'd script: ${manifest.version}`);
                        return manifest.version;
                    }
                }
            }

            // If no version found, return undefined
            return undefined;
        } catch (error) {
            this.logger.debug(`Failed to load script manifest for ${scriptName}: ${error}`);
            return undefined;
        }
    }

    /**
     * Clears detected integrations (for testing)
     */
    clear(): void {
        this.detectedIntegrations.clear();
    }
}
