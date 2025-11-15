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

    describe('dispatch handlers', () => {
        beforeEach(async () => {
            await platformLib.initialize();
        });

        // it('should return available platforms', () => {
        //     const queryHandler = mockBackendCommunicator.getHandler('platform-lib:get-available-platforms');
        //     const result = queryHandler();

        //     expect(result).toEqual({
        //         platforms: expect.arrayContaining(['kick', 'twitch'])
        //     });
        //     expect(mockLogger.debug).toHaveBeenCalledWith('Query platforms request');
        // });

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
