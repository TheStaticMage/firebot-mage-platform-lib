import { ScriptModules } from '@crowbartools/firebot-custom-scripts-types/types';
import {
    createErrorModal,
    createPlatformLibVersionInfo,
    initializeErrorModal,
    PLATFORM_LIB_VERSION
} from '@thestaticmage/mage-platform-lib-client';
import fs from 'fs';
import path from 'path';
import { platformCondition } from './conditions/platform';
import { KNOWN_INTEGRATIONS } from './constants';
import { chatPlatformEffect } from './effects/chat-platform';
import { incrementPlatformUserMetadataEffect } from './effects/increment-platform-user-metadata';
import { removePlatformUserMetadataEffect } from './effects/remove-platform-user-metadata';
import { setPlatformUserMetadataEffect } from './effects/set-platform-user-metadata';
import { updatePlatformUserCurrencyEffect } from './effects/update-platform-user-currency';
import { platformFilter } from './filters/platform';
import { IntegrationDetector } from './integration-detector';
import { PlatformUserDatabase } from './internal/platform-user-database';
import { LogWrapper } from './main';
import { PlatformDispatcher } from './platform-dispatcher';
import { platformRestriction } from './restrictions/platform';
import { registerRoutes, unregisterRoutes } from './server/server';
import { platformVariable } from './variables/platform';
import { createPlatformAwareUserDisplayNameVariable } from './variables/platform-aware-user-display-name';
import { createPlatformCurrencyVariable } from './variables/platform-currency';
import { createPlatformCurrencyByUserIdVariable } from './variables/platform-currency-by-user-id';

/**
 * Main Platform Library class that manages initialization and registration
 */
export class PlatformLibrary {
    private logger: LogWrapper;
    private modules: ScriptModules;
    private scriptDataDir: string;
    integrationDetector: IntegrationDetector;
    platformDispatcher: PlatformDispatcher;
    public userDatabase: PlatformUserDatabase;
    private criticalErrors: string[] = [];
    private showErrorModal: (title: string, message: string) => Promise<void>;

    constructor(logger: LogWrapper, modules: ScriptModules, scriptDataDir: string) {
        this.logger = logger;
        this.modules = modules;
        this.scriptDataDir = scriptDataDir;

        this.logger.debug(`PlatformLibrary constructor: scriptDataDir=${scriptDataDir}`);

        // Create a placeholder showErrorModal function - will be properly set during initialize()
        this.showErrorModal = async () => {
            throw new Error('Error modal not initialized');
        };

        // Initialize core services
        this.integrationDetector = new IntegrationDetector(logger, modules, scriptDataDir);

        this.platformDispatcher = new PlatformDispatcher(
            this.integrationDetector,
            modules,
            logger
        );

        this.userDatabase = new PlatformUserDatabase(scriptDataDir, logger);
    }

    /**
     * Initialize the platform library
     */
    async initialize(): Promise<void> {
        this.logger.debug('Initializing Platform Library...');
        this.criticalErrors = [];

        // Initialize error modal (registers UI extension and sets up global modules reference)
        await initializeErrorModal('mage-platform-lib', this.modules, this.logger, 5000);

        // Get the showErrorModal function from the factory
        const errorModalFactory = createErrorModal({
            modalName: 'mage-platform-lib',
            logger: this.logger
        });
        this.showErrorModal = errorModalFactory.showErrorModal;

        try {
            // Detect installed integrations
            this.logger.debug('Detecting and validating integrations...');
            await this.detectAndValidateIntegrations();

            // Set up verification handlers
            this.logger.debug('Setting up verification handlers...');
            this.setupVerificationHandlers();

            this.logger.debug('Setting up dispatch handlers...');
            this.setupDispatchHandlers();

            // Register server routes
            this.logger.debug('Registering HTTP endpoint handlers...');
            registerRoutes(this.modules, this.logger);

            // Initialize platform user database
            this.logger.debug('Initializing platform user database...');
            const platformDbPath = path.join(this.scriptDataDir, 'platform-users.db');
            const platformDbExists = fs.existsSync(platformDbPath);
            let databaseReady = false;
            try {
                await this.userDatabase.initialize();
                databaseReady = true;
            } catch (error) {
                const errorMsg = `Failed to initialize platform user database: ${error}`;
                this.logger.error(errorMsg);
                this.criticalErrors.push(errorMsg);
            }

            if (databaseReady) {
                await this.migrateKickUsersIfNeeded(platformDbExists);
            }

            // Register features
            this.logger.debug('Registering features...');
            this.registerFeatures();

            // Only log success if there were no critical errors
            if (this.criticalErrors.length === 0) {
                this.logger.info(`Platform Library v${PLATFORM_LIB_VERSION} initialized successfully`);
            }

            // Display critical errors if any occurred
            await this.displayCriticalErrors();
        } catch (error) {
            this.logger.error(`Failed to initialize Platform Library: ${error}`);
            await this.sendCriticalErrorNotification(`Failed to initialize Platform Library: ${error}`);
            throw error;
        }
    }

    private async migrateKickUsersIfNeeded(platformDbExists: boolean): Promise<void> {
        if (platformDbExists) {
            this.logger.debug('Platform user database already exists. Skipping Kick migration.');
            return;
        }

        const kickDataDir = path.resolve(this.scriptDataDir, '..', 'kick-integration');
        if (!fs.existsSync(kickDataDir)) {
            this.logger.debug('Kick integration data directory not found. Skipping Kick migration.');
            return;
        }

        const kickDbPath = path.join(kickDataDir, 'kick-users.db');
        if (!fs.existsSync(kickDbPath)) {
            this.logger.debug('Kick user database not found. Skipping Kick migration.');
            return;
        }

        try {
            this.logger.info('Kick user database found. Starting migration.');
            const result = await this.userDatabase.migrateFromKickDb(kickDbPath);
            this.logger.info(`Kick migration complete. Migrated: ${result.migrated}, skipped: ${result.skipped}`);
            if (result.conflicts.length > 0) {
                this.logger.warn(`Kick migration conflicts: ${result.conflicts.length}`);
            }
        } catch (error) {
            this.logger.error(`Kick migration failed: ${error}`);
        }
    }

    /**
     * Send a critical error notification to the user via custom error modal
     */
    private async sendCriticalErrorNotification(message: string): Promise<void> {
        try {
            await this.showErrorModal('Mage Platform Library Error', message);
            this.logger.info(`Critical error notification sent: ${message}`);
        } catch (error) {
            this.logger.error(`Failed to show error modal: ${error}`);
        }
    }

    /**
     * Display critical errors that occurred during initialization
     */
    private async displayCriticalErrors(): Promise<void> {
        if (this.criticalErrors.length > 0) {
            let errorMessage: string;

            if (this.criticalErrors.length === 1) {
                errorMessage = this.criticalErrors[0];
            } else {
                const errorList = this.criticalErrors.map((e, i) => `${i + 1}. ${e}`).join('<br><br>');
                errorMessage = `Multiple errors occurred:<br><br>${errorList}`;
            }

            // Add call to action
            errorMessage += '<br><br><strong>Please ensure that the Mage Platform Library and all multi-platform integrations (e.g., Kick or YouTube) are up-to-date.</strong>';

            await this.sendCriticalErrorNotification(errorMessage);
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
                this.logger.debug('Query platforms request received (platform-lib:get-available-platforms)');
                const platforms = this.integrationDetector.getAvailablePlatforms();
                this.logger.debug(`Query platforms response generated (platform-lib:get-available-platforms): ${platforms.join(', ')}`);
                return { platforms };
            }
        );

        // Dispatch handler - forwards operations to platforms
        frontendCommunicator.on(
            'platform-lib:dispatch',
            async (request: { platform: string; operation: string; data: unknown }) => {
                this.logger.debug(`Dispatch request: ${request.operation} to ${request.platform}`);

                try {
                    const response = await this.platformDispatcher.dispatchOperation(
                        request.operation as any,
                        request.platform,
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
                this.userDatabase,
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

        // Register platform currency by user ID variable
        try {
            const platformCurrencyByUserIdVariable = createPlatformCurrencyByUserIdVariable(
                this.userDatabase,
                this.logger
            );
            replaceVariableManager.registerReplaceVariable(platformCurrencyByUserIdVariable);
            this.logger.debug('Registered platform currency by user ID variable');
            successCount++;
        } catch (error) {
            const errorMsg = `Failed to register platform currency by user ID variable: ${error}`;
            this.logger.error(errorMsg);
            this.criticalErrors.push(`Platform currency by user ID variable registration failed. ${error}`);
            failureCount++;
        }

        // Register platform currency variable
        try {
            const platformCurrencyVariable = createPlatformCurrencyVariable(
                this.userDatabase,
                this.logger
            );
            replaceVariableManager.registerReplaceVariable(platformCurrencyVariable);
            this.logger.debug('Registered platform currency variable');
            successCount++;
        } catch (error) {
            const errorMsg = `Failed to register platform currency variable: ${error}`;
            this.logger.error(errorMsg);
            this.criticalErrors.push(`Platform currency variable registration failed. ${error}`);
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
            effectManager.registerEffect(chatPlatformEffect);
            this.logger.debug('Registered platform-aware chat effect');
            successCount++;
        } catch (error) {
            const errorMsg = `Failed to register platform-aware chat effect: ${error}`;
            this.logger.error(errorMsg);
            this.criticalErrors.push(`Platform-aware chat effect registration failed. ${error}`);
            failureCount++;
        }

        // Register platform user currency effect
        try {
            effectManager.registerEffect(updatePlatformUserCurrencyEffect);
            this.logger.debug('Registered platform user currency effect');
            successCount++;
        } catch (error) {
            const errorMsg = `Failed to register platform user currency effect: ${error}`;
            this.logger.error(errorMsg);
            this.criticalErrors.push(`Platform user currency effect registration failed. ${error}`);
            failureCount++;
        }

        // Register set platform user metadata effect
        try {
            effectManager.registerEffect(setPlatformUserMetadataEffect);
            this.logger.debug('Registered set platform user metadata effect');
            successCount++;
        } catch (error) {
            const errorMsg = `Failed to register set platform user metadata effect: ${error}`;
            this.logger.error(errorMsg);
            this.criticalErrors.push(`Set platform user metadata effect registration failed. ${error}`);
            failureCount++;
        }

        // Register remove platform user metadata effect
        try {
            effectManager.registerEffect(removePlatformUserMetadataEffect);
            this.logger.debug('Registered remove platform user metadata effect');
            successCount++;
        } catch (error) {
            const errorMsg = `Failed to register remove platform user metadata effect: ${error}`;
            this.logger.error(errorMsg);
            this.criticalErrors.push(`Remove platform user metadata effect registration failed. ${error}`);
            failureCount++;
        }

        // Register increment platform user metadata effect
        try {
            effectManager.registerEffect(incrementPlatformUserMetadataEffect);
            this.logger.debug('Registered increment platform user metadata effect');
            successCount++;
        } catch (error) {
            const errorMsg = `Failed to register increment platform user metadata effect: ${error}`;
            this.logger.error(errorMsg);
            this.criticalErrors.push(`Increment platform user metadata effect registration failed. ${error}`);
            failureCount++;
        }

        if (failureCount > 0) {
            this.logger.error(`Feature registration completed with ${successCount} successes and ${failureCount} failures`);
        } else {
            this.logger.info('All features registered successfully');
        }
    }

    /**
     * Shutdown the platform library
     */
    shutdown(): void {
        this.logger.info('Platform Library shutting down...');
        unregisterRoutes(this.modules, this.logger);
        this.logger.info('Platform Library shutdown complete');
    }
}
