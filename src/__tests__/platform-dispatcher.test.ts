/* eslint-disable @typescript-eslint/unbound-method */
import { PlatformDispatcher } from '../platform-dispatcher';
import { IntegrationDetector } from '../integration-detector';
import { ScriptModules } from '@crowbartools/firebot-custom-scripts-types/types';
import { LogWrapper } from '../main';
import {
    SendChatMessageRequest,
    GetUserDisplayNameRequest
} from '@thestaticmage/mage-platform-lib-client';
import { reflectEvent } from '../reflector';

jest.mock('../reflector');

describe('PlatformDispatcher', () => {
    let dispatcher: PlatformDispatcher;
    let mockIntegrationDetector: IntegrationDetector;
    let mockModules: ScriptModules;
    let mockLogger: LogWrapper;

    beforeEach(() => {
        jest.clearAllMocks();

        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        } as unknown as LogWrapper;

        mockIntegrationDetector = {
            isIntegrationDetected: jest.fn(),
            getDetectedIntegrationInfo: jest.fn()
        } as unknown as IntegrationDetector;

        mockModules = {
            frontendCommunicator: {
                fireEventAsync: jest.fn()
            },
            twitchChat: {
                sendChatMessage: jest.fn()
            },
            userDb: {
                getTwitchUserByUsername: jest.fn()
            }
        } as unknown as ScriptModules;

        (reflectEvent as jest.Mock).mockResolvedValue({ success: true });

        dispatcher = new PlatformDispatcher(
            mockIntegrationDetector,
            mockModules,
            mockLogger
        );
    });

    describe('dispatch', () => {
        it('should route to Twitch for twitch platform', async () => {
            const request: SendChatMessageRequest = { message: 'Hello' };

            await dispatcher.dispatch('twitch', 'send-chat-message', request);

            expect(mockModules.twitchChat.sendChatMessage).toHaveBeenCalledWith('Hello');
        });

        it('should route to integration for non-twitch platform', async () => {
            const request: SendChatMessageRequest = { message: 'Hello Kick' };

            (mockIntegrationDetector.isIntegrationDetected as jest.Mock).mockReturnValue(true);
            (mockIntegrationDetector.getDetectedIntegrationInfo as jest.Mock).mockReturnValue({
                scriptName: 'Kick Integration',
                version: '0.6.2'
            });

            await dispatcher.dispatch('kick', 'send-chat-message', request);

            expect(reflectEvent).toHaveBeenCalledWith(
                'mage-kick-integration:send-chat-message',
                request,
                true
            );
        });
    });

    describe('dispatchToTwitch', () => {
        describe('send-chat-message', () => {
            it('should send chat message without reply', async () => {
                const request: SendChatMessageRequest = { message: 'Test message' };

                const result = await dispatcher.dispatchToTwitch('send-chat-message', request);

                expect(mockModules.twitchChat.sendChatMessage).toHaveBeenCalledWith('Test message');
                expect(result).toEqual({ success: true });
            });

            it('should send chat message with reply', async () => {
                const request: SendChatMessageRequest = {
                    message: 'Reply message',
                    replyId: 'msg-123'
                };

                const result = await dispatcher.dispatchToTwitch('send-chat-message', request);

                expect(mockModules.twitchChat.sendChatMessage).toHaveBeenCalledWith(
                    'Reply message',
                    undefined,
                    undefined,
                    'msg-123'
                );
                expect(result).toEqual({ success: true });
            });

            it('should handle send errors', async () => {
                const request: SendChatMessageRequest = { message: 'Test' };
                (mockModules.twitchChat.sendChatMessage as jest.Mock).mockRejectedValue(
                    new Error('Send failed')
                );

                const result = await dispatcher.dispatchToTwitch('send-chat-message', request);

                expect(result).toEqual({ success: false, error: 'Send failed' });
            });
        });

        describe('get-user-display-name', () => {
            it('should get display name from user database', async () => {
                const request: GetUserDisplayNameRequest = { username: 'testuser' };
                (mockModules.userDb.getTwitchUserByUsername as jest.Mock).mockResolvedValue({
                    displayName: 'TestUser'
                });

                const result = await dispatcher.dispatchToTwitch('get-user-display-name', request);

                expect(result).toEqual({ displayName: 'TestUser' });
            });

            it('should fallback to username if no display name', async () => {
                const request: GetUserDisplayNameRequest = { username: 'testuser' };
                (mockModules.userDb.getTwitchUserByUsername as jest.Mock).mockResolvedValue({
                    displayName: null
                });

                const result = await dispatcher.dispatchToTwitch('get-user-display-name', request);

                expect(result).toEqual({ displayName: 'testuser' });
            });

            it('should fallback to username if viewer not found', async () => {
                const request: GetUserDisplayNameRequest = { username: 'testuser' };
                (mockModules.userDb.getTwitchUserByUsername as jest.Mock).mockResolvedValue(null);

                const result = await dispatcher.dispatchToTwitch('get-user-display-name', request);

                expect(result).toEqual({ displayName: 'testuser' });
            });

            it('should handle errors gracefully', async () => {
                const request: GetUserDisplayNameRequest = { username: 'testuser' };
                (mockModules.userDb.getTwitchUserByUsername as jest.Mock).mockRejectedValue(
                    new Error('Database error')
                );

                const result = await dispatcher.dispatchToTwitch('get-user-display-name', request);

                expect(result).toEqual({ displayName: null });
            });
        });

        it('should throw error for unsupported operation', async () => {
            await expect(
                dispatcher.dispatchToTwitch('unsupported-op' as never, {})
            ).rejects.toThrow('Unsupported Twitch operation');
        });
    });

    describe('dispatchToIntegration', () => {
        it('should dispatch to integration via IPC', async () => {
            const request: SendChatMessageRequest = { message: 'Hello Kick' };

            (mockIntegrationDetector.isIntegrationDetected as jest.Mock).mockReturnValue(true);
            (mockIntegrationDetector.getDetectedIntegrationInfo as jest.Mock).mockReturnValue({
                scriptName: 'Kick Integration',
                version: '0.6.2'
            });

            const result = await dispatcher.dispatchToIntegration('kick', 'send-chat-message', request);

            expect(reflectEvent).toHaveBeenCalledWith(
                'mage-kick-integration:send-chat-message',
                request,
                true
            );
            expect(result).toEqual({ success: true });
        });

        it('should throw error if integration not detected', async () => {
            (mockIntegrationDetector.isIntegrationDetected as jest.Mock).mockReturnValue(false);

            await expect(
                dispatcher.dispatchToIntegration('kick', 'send-chat-message', {})
            ).rejects.toThrow('Integration for platform "kick" is not installed');
        });

        it('should throw error if integration info not found', async () => {
            (mockIntegrationDetector.isIntegrationDetected as jest.Mock).mockReturnValue(true);
            (mockIntegrationDetector.getDetectedIntegrationInfo as jest.Mock).mockReturnValue(null);

            await expect(
                dispatcher.dispatchToIntegration('kick', 'send-chat-message', {})
            ).rejects.toThrow('Integration info not found for platform "kick"');
        });

        it('should handle IPC errors', async () => {
            const request: SendChatMessageRequest = { message: 'Hello' };

            (mockIntegrationDetector.isIntegrationDetected as jest.Mock).mockReturnValue(true);
            (mockIntegrationDetector.getDetectedIntegrationInfo as jest.Mock).mockReturnValue({
                scriptName: 'Kick Integration',
                version: '0.6.2'
            });
            (reflectEvent as jest.Mock).mockRejectedValue(
                new Error('IPC failed')
            );

            await expect(
                dispatcher.dispatchToIntegration('kick', 'send-chat-message', request)
            ).rejects.toThrow('IPC failed');

            expect(mockLogger.error).toHaveBeenCalled();
        });

        it('should handle timeout errors from reflector', async () => {
            const request: SendChatMessageRequest = { message: 'Hello' };

            (mockIntegrationDetector.isIntegrationDetected as jest.Mock).mockReturnValue(true);
            (mockIntegrationDetector.getDetectedIntegrationInfo as jest.Mock).mockReturnValue({
                scriptName: 'Kick Integration',
                version: '0.6.2'
            });

            // Mock reflectEvent to throw a timeout error
            (reflectEvent as jest.Mock).mockRejectedValue(
                new Error('Reflect event timeout')
            );

            await expect(
                dispatcher.dispatchToIntegration('kick', 'send-chat-message', request)
            ).rejects.toThrow('Reflect event timeout');
        });

        it('should dispatch to YouTube integration', async () => {
            const request: SendChatMessageRequest = { message: 'Hello YouTube' };

            (mockIntegrationDetector.isIntegrationDetected as jest.Mock).mockReturnValue(true);
            (mockIntegrationDetector.getDetectedIntegrationInfo as jest.Mock).mockReturnValue({
                scriptName: 'YouTube Integration',
                version: '0.0.1'
            });

            const result = await dispatcher.dispatchToIntegration('youtube', 'send-chat-message', request);

            expect(reflectEvent).toHaveBeenCalledWith(
                'mage-youtube-integration:send-chat-message',
                request,
                true
            );
            expect(result).toEqual({ success: true });
        });
    });

    describe('getIntegrationName', () => {
        it('should return correct name for kick', () => {
            const name = dispatcher.getIntegrationName('kick');
            expect(name).toBe('mage-kick-integration');
        });

        it('should return correct name for youtube', () => {
            const name = dispatcher.getIntegrationName('youtube');
            expect(name).toBe('mage-youtube-integration');
        });

        it('should throw error for unknown platform', () => {
            expect(() => dispatcher.getIntegrationName('unknown')).toThrow('Unknown platform: unknown');
        });
    });
});
