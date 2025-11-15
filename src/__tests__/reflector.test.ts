/* eslint-disable @typescript-eslint/unbound-method */
import { FrontendReflector } from '../reflector';
import { ScriptModules } from '@crowbartools/firebot-custom-scripts-types/types';
import { LogWrapper } from '../main';

describe('FrontendReflector', () => {
    let mockModules: ScriptModules;
    let mockLogger: LogWrapper;
    let reflector: FrontendReflector;
    let mockUiExtensionManager: {
        registerUIExtension: jest.Mock;
    };

    beforeEach(() => {
        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        } as unknown as LogWrapper;

        mockUiExtensionManager = {
            registerUIExtension: jest.fn()
        };

        mockModules = {
            uiExtensionManager: mockUiExtensionManager
        } as unknown as ScriptModules;

        reflector = new FrontendReflector(mockModules, mockLogger);
    });

    describe('initialize', () => {
        it('should register UI extension with correct ID', () => {
            reflector.initialize();

            expect(mockUiExtensionManager.registerUIExtension).toHaveBeenCalledTimes(1);
            const callArgs = mockUiExtensionManager.registerUIExtension.mock.calls[0][0];
            expect(callArgs.id).toBe('platform-lib-reflector');
        });

        it('should register extension with factory provider', () => {
            reflector.initialize();

            const callArgs = mockUiExtensionManager.registerUIExtension.mock.calls[0][0];
            expect(callArgs.providers).toBeDefined();
            expect(callArgs.providers?.factories).toBeDefined();
            expect(callArgs.providers?.factories?.length).toBe(1);
        });

        it('should register factory with correct name', () => {
            reflector.initialize();

            const callArgs = mockUiExtensionManager.registerUIExtension.mock.calls[0][0];
            const factory = callArgs.providers?.factories?.[0];
            expect(factory?.name).toBe('platformLibReflector');
        });

        it('should log initialization success', () => {
            reflector.initialize();

            expect(mockLogger.info).toHaveBeenCalledWith('Frontend reflector initialized successfully');
        });

        it('should warn if already initialized', () => {
            reflector.initialize();
            reflector.initialize();

            expect(mockLogger.warn).toHaveBeenCalledWith('Reflector already initialized');
            expect(mockUiExtensionManager.registerUIExtension).toHaveBeenCalledTimes(1);
        });

        it('should throw error if uiExtensionManager is not available', () => {
            const invalidModules = {} as ScriptModules;
            const invalidReflector = new FrontendReflector(invalidModules, mockLogger);

            expect(() => {
                invalidReflector.initialize();
            }).toThrow('UI Extension Manager not available');
        });

        it('should log and rethrow errors during initialization', () => {
            mockUiExtensionManager.registerUIExtension.mockImplementation(() => {
                throw new Error('Registration failed');
            });

            expect(() => {
                reflector.initialize();
            }).toThrow('Registration failed');
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed to initialize reflector')
            );
        });
    });

    describe('factory', () => {
        let registeredFactory: (frontendCommunicator: ScriptModules['frontendCommunicator']) => unknown;
        let mockFrontendCommunicator: {
            on: jest.Mock;
            fireEventAsync: jest.Mock;
        };
        let consoleLogSpy: jest.SpyInstance;
        let consoleErrorSpy: jest.SpyInstance;

        beforeEach(() => {
            // Suppress console output in tests
            consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
            consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            reflector.initialize();

            // Extract the registered factory function
            const callArgs = mockUiExtensionManager.registerUIExtension.mock.calls[0][0];
            const factory = callArgs.providers?.factories?.[0];
            registeredFactory = factory?.function as (frontendCommunicator: ScriptModules['frontendCommunicator']) => unknown;

            // Mock frontend communicator
            mockFrontendCommunicator = {
                on: jest.fn(),
                fireEventAsync: jest.fn()
            };
        });

        afterEach(() => {
            consoleLogSpy.mockRestore();
            consoleErrorSpy.mockRestore();
        });

        it('should register platform-lib:reflect handler', () => {
            registeredFactory(mockFrontendCommunicator as unknown as ScriptModules['frontendCommunicator']);

            expect(mockFrontendCommunicator.on).toHaveBeenCalledWith(
                'platform-lib:reflect',
                expect.any(Function)
            );
        });

        it('should register platform-lib:get-available-platforms handler', () => {
            registeredFactory(mockFrontendCommunicator as unknown as ScriptModules['frontendCommunicator']);

            expect(mockFrontendCommunicator.on).toHaveBeenCalledWith(
                'platform-lib:get-available-platforms',
                expect.any(Function)
            );
        });

        it('should forward reflect calls to platform-lib:dispatch', async () => {
            registeredFactory(mockFrontendCommunicator as unknown as ScriptModules['frontendCommunicator']);

            // Get the registered reflect handler
            const reflectHandler = mockFrontendCommunicator.on.mock.calls.find(
                call => call[0] === 'platform-lib:reflect'
            )?.[1];

            expect(reflectHandler).toBeDefined();

            // Mock the dispatch response
            const mockResponse = { success: true };
            mockFrontendCommunicator.fireEventAsync.mockResolvedValue(mockResponse);

            // Call the handler
            const data = { platform: 'kick', operation: 'send-chat-message', request: { message: 'test' } };
            const result = await reflectHandler(data);

            expect(mockFrontendCommunicator.fireEventAsync).toHaveBeenCalledWith(
                'platform-lib:dispatch',
                data
            );
            expect(result).toBe(mockResponse);
        });

        it('should forward get-available-platforms calls to query-platforms', async () => {
            registeredFactory(mockFrontendCommunicator as unknown as ScriptModules['frontendCommunicator']);

            // Get the registered platform query handler
            const platformHandler = mockFrontendCommunicator.on.mock.calls.find(
                call => call[0] === 'platform-lib:get-available-platforms'
            )?.[1];

            expect(platformHandler).toBeDefined();

            // Mock the query response
            const mockPlatforms = ['twitch', 'kick'];
            mockFrontendCommunicator.fireEventAsync.mockResolvedValue(mockPlatforms);

            // Call the handler
            const result = await platformHandler();

            expect(mockFrontendCommunicator.fireEventAsync).toHaveBeenCalledWith(
                'platform-lib:query-platforms',
                null
            );
            expect(result).toBe(mockPlatforms);
        });

        it('should handle reflect errors gracefully', async () => {
            registeredFactory(mockFrontendCommunicator as unknown as ScriptModules['frontendCommunicator']);

            const reflectHandler = mockFrontendCommunicator.on.mock.calls.find(
                call => call[0] === 'platform-lib:reflect'
            )?.[1];

            // Mock an error
            const error = new Error('Dispatch failed');
            mockFrontendCommunicator.fireEventAsync.mockRejectedValue(error);

            // Call should throw
            await expect(reflectHandler({ platform: 'kick', operation: 'test', request: {} })).rejects.toThrow('Dispatch failed');
        });

        it('should handle platform query errors gracefully', async () => {
            registeredFactory(mockFrontendCommunicator as unknown as ScriptModules['frontendCommunicator']);

            const platformHandler = mockFrontendCommunicator.on.mock.calls.find(
                call => call[0] === 'platform-lib:get-available-platforms'
            )?.[1];

            // Mock an error
            const error = new Error('Query failed');
            mockFrontendCommunicator.fireEventAsync.mockRejectedValue(error);

            // Call should throw
            await expect(platformHandler()).rejects.toThrow('Query failed');
        });

        it('should return service object', () => {
            const result = registeredFactory(mockFrontendCommunicator as unknown as ScriptModules['frontendCommunicator']);

            expect(result).toEqual({ initialized: true });
        });
    });

    describe('shutdown', () => {
        it('should mark reflector as not initialized', () => {
            reflector.initialize();
            reflector.shutdown();

            expect(mockLogger.debug).toHaveBeenCalledWith('Shutting down frontend reflector');
        });

        it('should do nothing if not initialized', () => {
            reflector.shutdown();

            expect(mockLogger.debug).not.toHaveBeenCalledWith('Shutting down frontend reflector');
        });
    });
});
