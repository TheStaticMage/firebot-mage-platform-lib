import { ScriptModules } from '@crowbartools/firebot-custom-scripts-types/types';
import { PLATFORM_LIB_VERSION, createPlatformLibVersionInfo } from '@mage-platform-lib/types';
import { PlatformLibrary } from '../platform-library';
import { LogWrapper } from '../main';

/* eslint-disable @typescript-eslint/unbound-method */

describe('PlatformLibrary', () => {
    let mockLogger: LogWrapper;
    let mockModules: ScriptModules;
    let mockBackendCommunicator: any;
    let mockFrontendCommunicator: any;
    let platformLib: PlatformLibrary;

    beforeEach(() => {
        // Mock logger
        mockLogger = {
            info: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
            warn: jest.fn()
        } as unknown as LogWrapper;

        // Mock backend communicator
        const handlers = new Map<string, (...args: any[]) => any>();
        mockBackendCommunicator = {
            on: jest.fn((event: string, handler: (...args: any[]) => any) => {
                handlers.set(event, handler);
            }),
            fireEventAsync: jest.fn()
        };

        // Mock frontend communicator
        mockFrontendCommunicator = {
            fireEventAsync: jest.fn()
        };

        // Mock modules
        mockModules = {
            backendCommunicator: mockBackendCommunicator,
            frontendCommunicator: mockFrontendCommunicator,
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
            }
        } as unknown as ScriptModules;

        // Helper to get registered handler
        mockBackendCommunicator.getHandler = (event: string) => handlers.get(event);

        platformLib = new PlatformLibrary(mockLogger, mockModules, false);
    });

    describe('initialize', () => {
        it('should initialize successfully', async () => {
            await platformLib.initialize();

            expect(mockLogger.info).toHaveBeenCalledWith('Initializing Platform Library...');
            expect(mockLogger.info).toHaveBeenCalledWith(`Platform Library v${PLATFORM_LIB_VERSION} initialized successfully`);
        });

        it('should set up verification handlers', async () => {
            await platformLib.initialize();

            expect(mockBackendCommunicator.on).toHaveBeenCalledWith('platform-lib:ping', expect.any(Function));
            expect(mockBackendCommunicator.on).toHaveBeenCalledWith('platform-lib:get-version', expect.any(Function));
        });

        it('should set up registration handlers', async () => {
            await platformLib.initialize();

            expect(mockBackendCommunicator.on).toHaveBeenCalledWith('platform-lib:register-integration', expect.any(Function));
            expect(mockBackendCommunicator.on).toHaveBeenCalledWith('platform-lib:deregister-integration', expect.any(Function));
        });

        it('should set up dispatch handlers', async () => {
            await platformLib.initialize();

            expect(mockBackendCommunicator.on).toHaveBeenCalledWith('platform-lib:get-available-platforms', expect.any(Function));
            expect(mockBackendCommunicator.on).toHaveBeenCalledWith('platform-lib:dispatch', expect.any(Function));
        });

        it('should register all features', async () => {
            await platformLib.initialize();

            // Should register 2 variables
            expect(mockModules.replaceVariableManager.registerReplaceVariable).toHaveBeenCalledTimes(2);
            // Should register 1 filter
            expect(mockModules.eventFilterManager.registerFilter).toHaveBeenCalledTimes(1);
            // Should register 1 condition
            expect(mockModules.conditionManager.registerConditionType).toHaveBeenCalledTimes(1);
            // Should register 1 restriction
            expect(mockModules.restrictionManager.registerRestriction).toHaveBeenCalledTimes(1);
            // Should register 1 effect
            expect(mockModules.effectManager.registerEffect).toHaveBeenCalledTimes(1);
        });

        it('should log error and throw on initialization failure', async () => {
            const error = new Error('Test initialization error');
            mockBackendCommunicator.on.mockImplementation(() => {
                throw error;
            });

            await expect(platformLib.initialize()).rejects.toThrow(error);
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to initialize Platform Library'));
        });
    });

    describe('verification handlers', () => {
        beforeEach(async () => {
            await platformLib.initialize();
        });

        it('should respond to ping with version info', () => {
            const pingHandler = mockBackendCommunicator.getHandler('platform-lib:ping');
            const result = pingHandler();

            expect(result).toEqual(createPlatformLibVersionInfo());
            expect(mockLogger.debug).toHaveBeenCalledWith('Received ping request');
        });

        it('should respond to get-version with version string', () => {
            const versionHandler = mockBackendCommunicator.getHandler('platform-lib:get-version');
            const result = versionHandler();

            expect(result).toBe(PLATFORM_LIB_VERSION);
            expect(mockLogger.debug).toHaveBeenCalledWith('Version requested');
        });
    });

    describe('registration handlers', () => {
        beforeEach(async () => {
            await platformLib.initialize();
        });

        it('should register integration successfully', () => {
            const registerHandler = mockBackendCommunicator.getHandler('platform-lib:register-integration');
            const request = {
                integration: {
                    integrationId: 'kick',
                    integrationName: 'mage-kick-integration',
                    platformLibVersion: '^1.0.0'
                }
            };

            const result = registerHandler(request);

            expect(result).toEqual({ success: true });
            expect(mockLogger.info).toHaveBeenCalledWith('Integration registered: kick');
            expect(mockLogger.debug).toHaveBeenCalledWith('Registration request from kick');
        });

        it('should handle registration errors', () => {
            const registerHandler = mockBackendCommunicator.getHandler('platform-lib:register-integration');
            // Request with undefined integration causes an error when trying to access properties
            const request = {
                integration: undefined
            };

            const result = registerHandler(request);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('Cannot read properties of undefined');
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to register integration'));
        });

        it('should deregister integration successfully', () => {
            // First register
            const registerHandler = mockBackendCommunicator.getHandler('platform-lib:register-integration');
            registerHandler({
                integration: {
                    integrationId: 'kick',
                    integrationName: 'mage-kick-integration',
                    platformLibVersion: '^1.0.0'
                }
            });

            // Then deregister
            const deregisterHandler = mockBackendCommunicator.getHandler('platform-lib:deregister-integration');
            const result = deregisterHandler({ integrationId: 'kick' });

            expect(result).toEqual({ success: true });
            expect(mockLogger.info).toHaveBeenCalledWith('Integration deregistered: kick');
            expect(mockLogger.debug).toHaveBeenCalledWith('Deregistration request from kick');
        });

        it('should handle deregistration errors', () => {
            const deregisterHandler = mockBackendCommunicator.getHandler('platform-lib:deregister-integration');
            // Request with undefined causes an error when trying to access integrationId
            const result = deregisterHandler(undefined);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('Cannot read properties of undefined');
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to deregister integration'));
        });
    });

    describe('dispatch handlers', () => {
        beforeEach(async () => {
            await platformLib.initialize();
        });

        it('should return available platforms', () => {
            // Register a test integration
            const registerHandler = mockBackendCommunicator.getHandler('platform-lib:register-integration');
            registerHandler({
                integration: {
                    integrationId: 'kick',
                    integrationName: 'mage-kick-integration',
                    platformLibVersion: '^1.0.0'
                }
            });

            const queryHandler = mockBackendCommunicator.getHandler('platform-lib:get-available-platforms');
            const result = queryHandler();

            expect(result).toEqual({
                platforms: expect.arrayContaining(['kick', 'twitch'])
            });
            expect(mockLogger.debug).toHaveBeenCalledWith('Query platforms request');
        });

        it('should dispatch operations to platform', async () => {
            const dispatchHandler = mockBackendCommunicator.getHandler('platform-lib:dispatch');
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
            const dispatchHandler = mockBackendCommunicator.getHandler('platform-lib:dispatch');
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

    describe('debug mode', () => {
        it('should create library with debug enabled', async () => {
            const debugLib = new PlatformLibrary(mockLogger, mockModules, true);
            await debugLib.initialize();

            expect(mockLogger.debug).toHaveBeenCalled();
        });
    });
});
