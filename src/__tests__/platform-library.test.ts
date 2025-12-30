import { ScriptModules } from '@crowbartools/firebot-custom-scripts-types/types';
import { PLATFORM_LIB_VERSION, createPlatformLibVersionInfo } from '@thestaticmage/mage-platform-lib-client';
import * as startupScriptsModule from '@thestaticmage/mage-platform-lib-client';
import { PlatformLibrary } from '../platform-library';
import { LogWrapper } from '../main';

jest.mock('@thestaticmage/mage-platform-lib-client', () => ({
    ...jest.requireActual('@thestaticmage/mage-platform-lib-client'),
    getStartupScripts: jest.fn().mockResolvedValue([]),
    resetStartupScriptsReflector: jest.fn()
}));

/* eslint-disable @typescript-eslint/unbound-method */

describe('PlatformLibrary', () => {
    let mockLogger: LogWrapper;
    let mockModules: ScriptModules;
    let mockFrontendCommunicator: any;
    let platformLib: PlatformLibrary;

    beforeEach(() => {
        jest.clearAllMocks();
        (startupScriptsModule.resetStartupScriptsReflector as jest.Mock)();

        // Mock logger
        mockLogger = {
            info: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
            warn: jest.fn()
        } as unknown as LogWrapper;

        // Mock frontend communicator with handler registration
        const handlers = new Map<string, (...args: any[]) => any>();
        mockFrontendCommunicator = {
            on: jest.fn((event: string, handler: (...args: any[]) => any) => {
                handlers.set(event, handler);
                // Simulate reflector and error modal initialization completing after a short delay
                if (event === 'mage-platform-lib:reflector-ready' || event === 'mage-platform-lib:error-modal-ready') {
                    setImmediate(() => handler());
                }
            }),
            onAsync: jest.fn((event: string, handler: (...args: any[]) => Promise<any>) => {
                handlers.set(event, handler);
            }),
            fireEventAsync: jest.fn().mockResolvedValue([]),
            send: jest.fn()
        };

        // Helper to get registered handler
        mockFrontendCommunicator.getHandler = (event: string) => handlers.get(event);

        // Mock path module
        const pathModule = {
            resolve: jest.fn((...args: string[]) => args.join('/')),
            join: jest.fn((...args: string[]) => args.join('/'))
        };

        // Mock modules
        mockModules = {
            frontendCommunicator: mockFrontendCommunicator,
            path: pathModule,
            httpServer: {
                registerCustomRoute: jest.fn(),
                unregisterCustomRoute: jest.fn()
            },
            uiExtensionManager: {
                registerUIExtension: jest.fn()
            },
            replaceVariableManager: {
                registerReplaceVariable: jest.fn()
            },
            eventFilterManager: {
                registerFilter: jest.fn()
            },
            conditionManager: {
                registerConditionType: jest.fn()
            },
            restrictionManager: {
                registerRestriction: jest.fn()
            },
            effectManager: {
                registerEffect: jest.fn()
            },
            integrationManager: {
                getIntegrationDefinitionById: jest.fn()
            },
            twitchChat: {
                sendChatMessage: jest.fn()
            },
            userDb: {
                getTwitchUserByUsername: jest.fn()
            }
        } as unknown as ScriptModules;

        platformLib = new PlatformLibrary(mockLogger, mockModules, '/mock/script-data/test');
    });

    describe('initialize', () => {
        it('should initialize successfully', async () => {
            await platformLib.initialize();

            expect(mockLogger.info).toHaveBeenCalledWith(`Platform Library v${PLATFORM_LIB_VERSION} initialized successfully`);
        });

        it('should set up verification handlers', async () => {
            await platformLib.initialize();

            expect(mockFrontendCommunicator.on).toHaveBeenCalledWith('platform-lib:ping', expect.any(Function));
            expect(mockFrontendCommunicator.on).toHaveBeenCalledWith('platform-lib:get-version', expect.any(Function));
        });

        it('should set up dispatch handlers', async () => {
            await platformLib.initialize();

            expect(mockFrontendCommunicator.on).toHaveBeenCalledWith('platform-lib:get-available-platforms', expect.any(Function));
            expect(mockFrontendCommunicator.on).toHaveBeenCalledWith('platform-lib:dispatch', expect.any(Function));
        });

        it('should register all features', async () => {
            await platformLib.initialize();

            // Should register 2 variables
            expect(mockModules.replaceVariableManager.registerReplaceVariable).toHaveBeenCalledTimes(2);
            // Should register 1 filter
            expect(mockModules.eventFilterManager.registerFilter).toHaveBeenCalledTimes(1);
            // Should register 1 condition (platform)
            expect(mockModules.conditionManager.registerConditionType).toHaveBeenCalledTimes(1);
            // Should register 1 restriction
            expect(mockModules.restrictionManager.registerRestriction).toHaveBeenCalledTimes(1);
            // Should register 1 effect
            expect(mockModules.effectManager.registerEffect).toHaveBeenCalledTimes(1);

            // Should not display error modal when successful
            expect(mockFrontendCommunicator.send).not.toHaveBeenCalledWith('error', expect.anything());
        });

        it('should handle feature registration failures gracefully', async () => {
            const registrationError = new Error('A variable with the handle platform already exists.');
            mockModules.replaceVariableManager.registerReplaceVariable = jest.fn().mockImplementation(() => {
                throw registrationError;
            });

            // Should not throw, should complete initialization
            await platformLib.initialize();

            // Should log the registration errors
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to register platform variable'));
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to register platform-aware user display name variable'));

            // Should log error about failures
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Feature registration completed with'));
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('failures'));

            // Should NOT log success message when there are critical errors
            expect(mockLogger.info).not.toHaveBeenCalledWith(`Platform Library v${PLATFORM_LIB_VERSION} initialized successfully`);

            // Should have critical errors recorded
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to register'));
        });

        it('should log error and throw on handler setup failure', async () => {
            const error = new Error('Test initialization error');
            const handlers = new Map<string, (...args: any[]) => any>();
            mockFrontendCommunicator.on.mockImplementation((event: string, handler: (...args: any[]) => any) => {
                handlers.set(event, handler);
                // Still need to simulate reflector-ready even when other handlers fail
                if (event === 'mage-platform-lib:reflector-ready' || event === 'mage-platform-lib:error-modal-ready') {
                    setImmediate(() => handler());
                } else {
                    // Only throw for platform handlers, not for reflector/error-modal ready
                    throw error;
                }
            });

            await expect(platformLib.initialize()).rejects.toThrow(error);
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to initialize Platform Library'));

            // Should attempt to display critical error through error modal
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to initialize Platform Library'));
        });
    });

    describe('verification handlers', () => {
        beforeEach(async () => {
            await platformLib.initialize();
        });

        it('should respond to ping with version info', () => {
            const pingHandler = mockFrontendCommunicator.getHandler('platform-lib:ping');
            const result = pingHandler();

            expect(result).toEqual(createPlatformLibVersionInfo());
            expect(mockLogger.debug).toHaveBeenCalledWith('Received ping request');
        });

        it('should respond to get-version with version string', () => {
            const versionHandler = mockFrontendCommunicator.getHandler('platform-lib:get-version');
            const result = versionHandler();

            expect(result).toBe(PLATFORM_LIB_VERSION);
            expect(mockLogger.debug).toHaveBeenCalledWith('Version requested');
        });
    });

    describe('dispatch handlers', () => {
        beforeEach(async () => {
            await platformLib.initialize();
        });

        it('should dispatch operations to platform', async () => {
            const dispatchHandler = mockFrontendCommunicator.getHandler('platform-lib:dispatch');
            const request = {
                platform: 'twitch',
                operation: 'send-chat-message',
                data: { message: 'test' }
            };

            // Mock the dispatch to return a success response
            mockFrontendCommunicator.fireEventAsync.mockResolvedValue({
                success: true
            });

            const result = await dispatchHandler(request);

            expect(mockLogger.debug).toHaveBeenCalledWith('Dispatch request: send-chat-message to twitch');
            expect(result).toBeDefined();
        });

        it('should handle dispatch errors', async () => {
            const dispatchHandler = mockFrontendCommunicator.getHandler('platform-lib:dispatch');
            const request = {
                platform: 'unknown',
                operation: 'invalid-op',
                data: {}
            };

            await expect(dispatchHandler(request)).rejects.toThrow('Integration for platform "unknown" is not installed');
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Dispatch failed'));
        });
    });

    describe('shutdown', () => {
        it('should shutdown cleanly', () => {
            platformLib.shutdown();

            expect(mockLogger.info).toHaveBeenCalledWith('Platform Library shutting down...');
            expect(mockLogger.info).toHaveBeenCalledWith('Platform Library shutdown complete');
        });
    });
});
