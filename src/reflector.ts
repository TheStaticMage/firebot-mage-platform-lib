import { ScriptModules } from '@crowbartools/firebot-custom-scripts-types/types';
import { LogWrapper } from './main';

/**
 * Frontend Reflector provides IPC bridging between frontend and backend
 *
 * This creates a hidden UI extension that registers frontend IPC handlers
 * which forward calls to the backend handlers. This allows frontend components
 * (like effect option controllers) to communicate with the platform library.
 */
export class FrontendReflector {
    private modules: ScriptModules;
    private logger: LogWrapper;
    private initialized = false;

    constructor(modules: ScriptModules, logger: LogWrapper) {
        this.modules = modules;
        this.logger = logger;
    }

    /**
     * Initializes the reflector by setting up the UI extension
     */
    initialize(): void {
        if (this.initialized) {
            this.logger.warn('Reflector already initialized');
            return;
        }

        try {
            this.logger.debug('Initializing frontend reflector...');
            this.setupReflectorExtension();
            this.initialized = true;
            this.logger.info('Frontend reflector initialized successfully');
        } catch (error) {
            this.logger.error(`Failed to initialize reflector: ${error}`);
            throw error;
        }
    }

    /**
     * Sets up the UI extension that handles IPC reflection
     */
    setupReflectorExtension(): void {
        const { uiExtensionManager } = this.modules;

        if (!uiExtensionManager) {
            throw new Error('UI Extension Manager not available');
        }

        // Register a UI extension with an AngularJS factory that provides IPC handlers
        uiExtensionManager.registerUIExtension({
            id: 'platform-lib-reflector',
            providers: {
                factories: [
                    {
                        name: 'platformLibReflector',
                        function: (frontendCommunicator: ScriptModules['frontendCommunicator']) => {
                            // Handler: Reflect dispatch calls from frontend to backend
                            const reflectHandler = async (data: { platform: string; operation: string; request: unknown }) => {
                                try {
                                    // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
                                    const response = await frontendCommunicator.fireEventAsync(
                                        'platform-lib:dispatch',
                                        data
                                    );
                                    return response;
                                } catch (error) {
                                    // eslint-disable-next-line no-console
                                    console.error('[Platform Lib Reflector] Dispatch reflection failed:', error);
                                    throw error;
                                }
                            };
                            frontendCommunicator.on('platform-lib:reflect', reflectHandler);

                            // Handler: Reflect platform query calls from frontend to backend
                            const platformQueryHandler = async () => {
                                try {
                                    const platforms = await frontendCommunicator.fireEventAsync<string[]>(
                                        'platform-lib:query-platforms',
                                        null
                                    );
                                    return platforms;
                                } catch (error) {
                                    // eslint-disable-next-line no-console
                                    console.error('[Platform Lib Reflector] Platform query reflection failed:', error);
                                    throw error;
                                }
                            };
                            frontendCommunicator.on('platform-lib:get-available-platforms', platformQueryHandler);

                            // eslint-disable-next-line no-console
                            console.log('[Platform Lib Reflector] Frontend IPC handlers registered');

                            // Return a service object (required for factories)
                            return {
                                initialized: true
                            };
                        }
                    }
                ]
            }
        });

        this.logger.debug('Reflector UI extension registered');
    }

    /**
     * Shuts down the reflector
     */
    shutdown(): void {
        if (!this.initialized) {
            return;
        }

        this.logger.debug('Shutting down frontend reflector');
        this.initialized = false;
        // Note: UI extensions cannot be easily unregistered in Firebot
        // They persist until Firebot restart
    }
}
