import { ScriptModules } from '@crowbartools/firebot-custom-scripts-types/types';
import {
    createPlatformLibVersionInfo,
    PLATFORM_LIB_VERSION
} from '@mage-platform-lib/types';
import { platformCondition } from './conditions/platform';
import { createChatPlatformEffect } from './effects/chat-platform';
import { platformFilter } from './filters/platform';
import { IntegrationDetector } from './integration-detector';
import { LogWrapper } from './main';
import { PlatformDispatcher } from './platform-dispatcher';
import { platformRestriction } from './restrictions/platform';
import { platformVariable } from './variables/platform';
import { createPlatformAwareUserDisplayNameVariable } from './variables/platform-aware-user-display-name';
import { KNOWN_INTEGRATIONS } from './constants';
import { reflectorExtension } from './reflector';

/**
 * Main Platform Library class that manages initialization and registration
 */
export class PlatformLibrary {
    private logger: LogWrapper;
    private modules: ScriptModules;
    private scriptDataDir: string;
    private debug: boolean;
    private integrationDetector: IntegrationDetector;
    private platformDispatcher: PlatformDispatcher;
    private criticalErrors: string[] = [];

    constructor(logger: LogWrapper, modules: ScriptModules, scriptDataDir: string, debug = false) {
        this.logger = logger;
        this.modules = modules;
        this.scriptDataDir = scriptDataDir;
        this.debug = debug;

        this.logger.debug(`PlatformLibrary constructor: scriptDataDir=${scriptDataDir}`);

        // Initialize core services
        this.integrationDetector = new IntegrationDetector(logger, modules, scriptDataDir);

        this.platformDispatcher = new PlatformDispatcher(
            this.integrationDetector,
            modules,
            logger
        );
    }

    /**
     * Initialize the platform library
     */
    async initialize(): Promise<void> {
        this.logger.debug('Initializing Platform Library...');
        this.criticalErrors = [];

        // Register the reflector UI extension for backend-to-backend communication
        this.registerReflectorExtension();

        // Wait for reflector to be ready before using reflectEvent
        await this.waitForReflectorReady();

        try {
            // Detect installed integrations
            this.logger.debug('Detecting and validating integrations...');
            await this.detectAndValidateIntegrations();

            // Set up IPC handlers
            this.logger.debug('Setting up verification handlers...');
            this.setupVerificationHandlers();

            this.logger.debug('Setting up dispatch handlers...');
            this.setupDispatchHandlers();

            // Register features
            this.logger.debug('Registering features...');
            this.registerFeatures();

            // Only log success if there were no critical errors
            if (this.criticalErrors.length === 0) {
                this.logger.info(`Platform Library v${PLATFORM_LIB_VERSION} initialized successfully`);
            }

            // Display critical errors if any occurred
            this.displayCriticalErrors();
        } catch (error) {
            this.logger.error(`Failed to initialize Platform Library: ${error}`);
            this.sendCriticalErrorNotification(`Failed to initialize Platform Library: ${error}`);
            throw error;
        }
    }

    /**
     * Send a critical error notification to the user via modal
     */
    private sendCriticalErrorNotification(message: string): void {
        const { frontendCommunicator } = this.modules;
        frontendCommunicator.send('error', `Mage Platform Library: ${message}`);
        this.logger.info(`Critical error notification sent: ${message}`);
    }

    /**
     * Display critical errors that occurred during initialization
     */
    private displayCriticalErrors(): void {
        if (this.criticalErrors.length > 0) {
            let errorMessage: string;

            if (this.criticalErrors.length === 1) {
                errorMessage = this.criticalErrors[0];
            } else {
                const errorList = this.criticalErrors.map((e, i) => `${i + 1}. ${e}`).join('\n\n');
                errorMessage = `Multiple errors occurred:\n\n${errorList}`;
            }

            // Add call to action
            errorMessage += '\n\n**Please ensure that the Mage Platform Library and all multi-platform integrations (e.g., Kick or YouTube) are up-to-date.**';

            this.sendCriticalErrorNotification(errorMessage);
        }
    }

    /**
     * Detect and validate installed integrations
     */
    private async detectAndValidateIntegrations(): Promise<void> {
        // Detect installed integrations
        await this.integrationDetector.detectInstalledIntegrations();

        // Check each known integration
        for (const integration of KNOWN_INTEGRATIONS) {
            const info = this.integrationDetector.getDetectedIntegrationInfo(integration.platformId);

            if (info) {
                // Integration found - log version
                this.logger.debug(`Found ${integration.platformId} integration (version: ${info.version || 'unknown'})`);

                // Check version compatibility
                if (info.version) {
                    const versionCheck = this.integrationDetector.checkIntegrationCompatibility(
                        integration.platformId,
                        integration.semverRange
                    );

                    if (!versionCheck.compatible) {
                        const errorMsg = `${integration.platformId} integration version ${info.version} is incompatible. ${versionCheck.reason}. Required: ${integration.semverRange}`;
                        this.logger.error(errorMsg);
                        this.criticalErrors.push(errorMsg);
                    }
                } else {
                    const errorMsg = `${integration.platformId} integration has no version information`;
                    this.logger.error(errorMsg);
                    this.criticalErrors.push(errorMsg);
                }
            } else {
                // Integration not found
                this.logger.debug(`${integration.platformId} integration not installed`);
            }
        }
    }

    /**
     * Set up verification and version check handlers
     */
    setupVerificationHandlers(): void {
        const frontendCommunicator = this.modules.frontendCommunicator;

        // Ping handler - confirms library is loaded
        frontendCommunicator.on('platform-lib:ping', () => {
            this.logger.debug('Received ping request');
            return createPlatformLibVersionInfo();
        });

        // Version handler - returns current version
        frontendCommunicator.on('platform-lib:get-version', () => {
            this.logger.debug('Version requested');
            return PLATFORM_LIB_VERSION;
        });

        // Script manifest handler - loads a custom script and extracts its manifest
        frontendCommunicator.onAsync('platform-lib:get-script-manifest', async (request: { scriptName: string }) => {
            if (!request || !request.scriptName) {
                return { version: undefined };
            }

            try {
                // Try to load the script and extract its manifest
                const scriptManifest = this.loadScriptManifest(request.scriptName);
                return scriptManifest;
            } catch (error) {
                this.logger.debug(`Failed to load manifest for script ${request.scriptName}: ${error}`);
                return { version: undefined };
            }
        });

        this.logger.debug('Verification handlers registered');
    }

    /**
     * Set up platform dispatch handlers
     */
    setupDispatchHandlers(): void {
        const frontendCommunicator = this.modules.frontendCommunicator;

        // Query available platforms handler
        frontendCommunicator.on(
            'platform-lib:get-available-platforms',
            () => {
                this.logger.debug('Query platforms request');
                const platforms = this.integrationDetector.getAvailablePlatforms();
                return { platforms };
            }
        );

        // Note: getStartupScripts handler is expected to be provided by Firebot's main backend
        // The reflector will forward requests to that handler via backendCommunicator

        // Dispatch handler - forwards operations to platforms
        frontendCommunicator.on(
            'platform-lib:dispatch',
            async (request: { platform: string; operation: string; data: unknown }) => {
                this.logger.debug(`Dispatch request: ${request.operation} to ${request.platform}`);

                try {
                    const response = await this.platformDispatcher.dispatch(
                        request.platform,
                        request.operation as any,
                        request.data
                    );
                    return response;
                } catch (error) {
                    this.logger.error(`Dispatch failed: ${error}`);
                    throw error;
                }
            }
        );

        this.logger.debug('Dispatch handlers registered');
    }

    /**
     * Register all platform library features
     */
    registerFeatures(): void {
        const {
            replaceVariableManager,
            eventFilterManager,
            conditionManager,
            restrictionManager,
            effectManager
        } = this.modules;

        let successCount = 0;
        let failureCount = 0;

        // Register platform variable
        try {
            replaceVariableManager.registerReplaceVariable(platformVariable);
            this.logger.debug('Registered platform variable');
            successCount++;
        } catch (error) {
            const errorMsg = `Failed to register platform variable: ${error}`;
            this.logger.error(errorMsg);
            this.criticalErrors.push(`Platform variable registration failed. This may indicate an incompatible integration is installed. ${error}`);
            failureCount++;
        }

        // Register platform-aware user display name variable
        try {
            const platformAwareUserDisplayNameVariable = createPlatformAwareUserDisplayNameVariable(
                this.platformDispatcher,
                this.logger
            );
            replaceVariableManager.registerReplaceVariable(platformAwareUserDisplayNameVariable);
            this.logger.debug('Registered platform-aware user display name variable');
            successCount++;
        } catch (error) {
            const errorMsg = `Failed to register platform-aware user display name variable: ${error}`;
            this.logger.error(errorMsg);
            this.criticalErrors.push(`Platform-aware user display name variable registration failed. ${error}`);
            failureCount++;
        }

        // Register filter
        try {
            eventFilterManager.registerFilter(platformFilter);
            this.logger.debug('Registered platform filter');
            successCount++;
        } catch (error) {
            const errorMsg = `Failed to register platform filter: ${error}`;
            this.logger.error(errorMsg);
            this.criticalErrors.push(`Platform filter registration failed. ${error}`);
            failureCount++;
        }

        // Register condition
        try {
            conditionManager.registerConditionType(platformCondition);
            this.logger.debug('Registered platform condition');
            successCount++;
        } catch (error) {
            const errorMsg = `Failed to register platform condition: ${error}`;
            this.logger.error(errorMsg);
            this.criticalErrors.push(`Platform condition registration failed. ${error}`);
            failureCount++;
        }

        // Register restriction
        try {
            restrictionManager.registerRestriction(platformRestriction);
            this.logger.debug('Registered platform restriction');
            successCount++;
        } catch (error) {
            const errorMsg = `Failed to register platform restriction: ${error}`;
            this.logger.error(errorMsg);
            this.criticalErrors.push(`Platform restriction registration failed. ${error}`);
            failureCount++;
        }

        // Register effect
        try {
            const chatPlatformEffect = createChatPlatformEffect(
                this.integrationDetector,
                this.platformDispatcher,
                this.modules.frontendCommunicator,
                this.logger
            );
            effectManager.registerEffect(chatPlatformEffect);
            this.logger.debug('Registered platform-aware chat effect');
            successCount++;
        } catch (error) {
            const errorMsg = `Failed to register platform-aware chat effect: ${error}`;
            this.logger.error(errorMsg);
            this.criticalErrors.push(`Platform-aware chat effect registration failed. ${error}`);
            failureCount++;
        }

        if (failureCount > 0) {
            this.logger.error(`Feature registration completed with ${successCount} successes and ${failureCount} failures`);
        } else {
            this.logger.info('All features registered successfully');
        }
    }

    /**
     * Wait for the reflector UI extension to be initialized
     */
    private waitForReflectorReady(): Promise<void> {
        return new Promise((resolve) => {
            const { frontendCommunicator } = this.modules;
            const timeoutMs = 5000;

            const timeout = setTimeout(() => {
                const errorMsg = `Reflector UI extension did not initialize within ${timeoutMs}ms`;
                this.logger.error(errorMsg);
                this.criticalErrors.push(errorMsg);
                // Resolve anyway to allow initialization to continue
                resolve();
            }, timeoutMs);

            frontendCommunicator.on('mage-platform-lib:reflector-ready', () => {
                clearTimeout(timeout);
                this.logger.debug('Reflector is ready');
                resolve();
            });
        });
    }

    /**
     * Register the reflector UI extension for backend-to-backend communication
     */
    private registerReflectorExtension(): void {
        try {
            const { uiExtensionManager } = this.modules;
            if (!uiExtensionManager) {
                throw new Error('UI Extension Manager not available');
            }
            uiExtensionManager.registerUIExtension(reflectorExtension);
            this.logger.debug('Reflector UI extension registered');
        } catch (error) {
            const errorMsg = `Failed to register reflector UI extension: ${error}`;
            this.logger.error(errorMsg);
            this.criticalErrors.push(errorMsg);
        }
    }

    /**
     * Load a custom script and extract its manifest
     * @param scriptName Name of the script file to load
     * @returns Object containing manifest data (version, etc.)
     */
    private loadScriptManifest(scriptName: string): { version?: string } {
        try {
            // Get the path module to construct the full script path
            const pathModule = this.modules.path;
            if (!pathModule) {
                return { version: undefined };
            }

            // Construct full script path from scriptDataDir
            // scriptDataDir is at {profile}/script-data/{script-name}/
            // scripts folder is at {profile}/scripts/
            const scriptsFolder = pathModule.resolve(this.scriptDataDir, '../../scripts');
            const scriptPath = pathModule.join(scriptsFolder, scriptName);

            // Dynamically require the script module
            const customScript = require(scriptPath);

            // Try to get the manifest from the script's export
            if (typeof customScript.getScriptManifest === 'function') {
                const manifest = customScript.getScriptManifest();
                if (manifest && typeof manifest === 'object' && manifest.version) {
                    return { version: manifest.version };
                }
            }

            // If no manifest or version, return undefined
            return { version: undefined };
        } catch (error) {
            this.logger.debug(`Failed to load script manifest for ${scriptName}: ${error}`);
            return { version: undefined };
        }
    }

    /**
     * Shutdown the platform library
     */
    shutdown(): void {
        this.logger.info('Platform Library shutting down...');
        // Cleanup if needed
        this.logger.info('Platform Library shutdown complete');
    }
}
