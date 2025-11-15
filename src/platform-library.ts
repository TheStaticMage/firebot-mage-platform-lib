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

/**
 * Main Platform Library class that manages initialization and registration
 */
export class PlatformLibrary {
    private logger: LogWrapper;
    private modules: ScriptModules;
    private debug: boolean;
    private integrationDetector: IntegrationDetector;
    private platformDispatcher: PlatformDispatcher;

    constructor(logger: LogWrapper, modules: ScriptModules, debug = false) {
        this.logger = logger;
        this.modules = modules;
        this.debug = debug;

        // Initialize core services
        this.integrationDetector = new IntegrationDetector(
            modules,
            logger
        );

        this.platformDispatcher = new PlatformDispatcher(
            this.integrationDetector,
            modules.frontendCommunicator,
            modules,
            logger
        );
    }

    /**
     * Initialize the platform library
     */
    async initialize(): Promise<void> {
        this.logger.info('Initializing Platform Library...');

        try {
            // Set up IPC handlers
            this.setupVerificationHandlers();
            this.setupDispatchHandlers();

            // Register features
            this.registerFeatures();

            this.logger.info(`Platform Library v${PLATFORM_LIB_VERSION} initialized successfully`);
        } catch (error) {
            this.logger.error(`Failed to initialize Platform Library: ${error}`);
            throw error;
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
                this.logger.debug('Query platforms request');
                const platforms = this.integrationDetector.getAvailablePlatforms();
                return { platforms };
            }
        );

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

        // Register variables
        replaceVariableManager.registerReplaceVariable(platformVariable);
        this.logger.debug('Registered platform variable');

        const platformAwareUserDisplayNameVariable = createPlatformAwareUserDisplayNameVariable(
            this.platformDispatcher,
            this.logger
        );
        replaceVariableManager.registerReplaceVariable(platformAwareUserDisplayNameVariable);
        this.logger.debug('Registered platform-aware user display name variable');

        // Register filter
        eventFilterManager.registerFilter(platformFilter);
        this.logger.debug('Registered platform filter');

        // Register condition
        conditionManager.registerConditionType(platformCondition);
        this.logger.debug('Registered platform condition');

        // Register restriction
        restrictionManager.registerRestriction(platformRestriction);
        this.logger.debug('Registered platform restriction');

        // Register effect
        const chatPlatformEffect = createChatPlatformEffect(
            this.integrationDetector,
            this.platformDispatcher,
            this.modules.frontendCommunicator,
            this.logger
        );
        effectManager.registerEffect(chatPlatformEffect);
        this.logger.debug('Registered platform-aware chat effect');

        this.logger.info('All features registered successfully');
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
