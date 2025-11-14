/* eslint-disable @typescript-eslint/unbound-method */
import { PlatformDispatcher } from '../platform-dispatcher';
import { IntegrationDetector } from '../integration-detector';
import { ScriptModules } from '@crowbartools/firebot-custom-scripts-types/types';
import { LogWrapper } from '../main';
import {
    SendChatMessageRequest,
    GetUserDisplayNameRequest,
    BanUserRequest,
    TimeoutUserRequest,
    SetStreamTitleRequest,
    SetStreamCategoryRequest
} from '@mage-platform-lib/types';

describe('PlatformDispatcher', () => {
    let dispatcher: PlatformDispatcher;
    let mockIntegrationDetector: IntegrationDetector;
    let mockModules: ScriptModules;
    let mockLogger: LogWrapper;

    beforeEach(() => {
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
            },
            twitchApi: {
                moderation: {
                    banUser: jest.fn(),
                    timeoutUser: jest.fn()
                },
                channels: {
                    updateChannelInformation: jest.fn()
                },
                categories: {
                    searchCategories: jest.fn()
                }
            }
        } as unknown as ScriptModules;

        dispatcher = new PlatformDispatcher(
            mockIntegrationDetector,
            mockModules.frontendCommunicator,
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
            (mockModules.frontendCommunicator.fireEventAsync as jest.Mock).mockResolvedValue({
                success: true
            });

            await dispatcher.dispatch('kick', 'send-chat-message', request);

            expect(mockModules.frontendCommunicator.fireEventAsync).toHaveBeenCalledWith(
                'mage-kick-integration:send-chat-message',
                request
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

        describe('ban-user', () => {
            it('should ban user without reason', async () => {
                const request: BanUserRequest = { username: 'baduser' };

                const result = await dispatcher.dispatchToTwitch('ban-user', request);

                expect(mockModules.twitchApi.moderation.banUser).toHaveBeenCalledWith(
                    'baduser',
                    undefined
                );
                expect(result).toEqual({ success: true });
            });

            it('should ban user with reason', async () => {
                const request: BanUserRequest = {
                    username: 'baduser',
                    reason: 'Spam'
                };

                const result = await dispatcher.dispatchToTwitch('ban-user', request);

                expect(mockModules.twitchApi.moderation.banUser).toHaveBeenCalledWith(
                    'baduser',
                    'Spam'
                );
                expect(result).toEqual({ success: true });
            });

            it('should handle ban errors', async () => {
                const request: BanUserRequest = { username: 'baduser' };
                (mockModules.twitchApi.moderation.banUser as jest.Mock).mockRejectedValue(
                    new Error('Ban failed')
                );

                const result = await dispatcher.dispatchToTwitch('ban-user', request);

                expect(result).toEqual({ success: false, error: 'Ban failed' });
            });
        });

        describe('timeout-user', () => {
            it('should timeout user with duration in minutes converted to seconds', async () => {
                const request: TimeoutUserRequest = {
                    username: 'chatty',
                    durationMinutes: 5
                };

                const result = await dispatcher.dispatchToTwitch('timeout-user', request);

                expect(mockModules.twitchApi.moderation.timeoutUser).toHaveBeenCalledWith(
                    'chatty',
                    300, // 5 minutes * 60 seconds
                    undefined
                );
                expect(result).toEqual({ success: true });
            });

            it('should timeout user with reason', async () => {
                const request: TimeoutUserRequest = {
                    username: 'chatty',
                    durationMinutes: 10,
                    reason: 'Too chatty'
                };

                const result = await dispatcher.dispatchToTwitch('timeout-user', request);

                expect(mockModules.twitchApi.moderation.timeoutUser).toHaveBeenCalledWith(
                    'chatty',
                    600,
                    'Too chatty'
                );
                expect(result).toEqual({ success: true });
            });

            it('should handle timeout errors', async () => {
                const request: TimeoutUserRequest = {
                    username: 'chatty',
                    durationMinutes: 5
                };
                (mockModules.twitchApi.moderation.timeoutUser as jest.Mock).mockRejectedValue(
                    new Error('Timeout failed')
                );

                const result = await dispatcher.dispatchToTwitch('timeout-user', request);

                expect(result).toEqual({ success: false, error: 'Timeout failed' });
            });
        });

        describe('set-stream-title', () => {
            it('should set stream title', async () => {
                const request: SetStreamTitleRequest = { title: 'New Stream Title' };

                const result = await dispatcher.dispatchToTwitch('set-stream-title', request);

                expect(mockModules.twitchApi.channels.updateChannelInformation).toHaveBeenCalledWith({
                    title: 'New Stream Title'
                });
                expect(result).toEqual({ success: true });
            });

            it('should handle title update errors', async () => {
                const request: SetStreamTitleRequest = { title: 'New Title' };
                (mockModules.twitchApi.channels.updateChannelInformation as jest.Mock).mockRejectedValue(
                    new Error('Update failed')
                );

                const result = await dispatcher.dispatchToTwitch('set-stream-title', request);

                expect(result).toEqual({ success: false, error: 'Update failed' });
            });
        });

        describe('set-stream-category', () => {
            it('should set stream category by name', async () => {
                const request: SetStreamCategoryRequest = { category: 'Just Chatting' };
                (mockModules.twitchApi.categories.searchCategories as jest.Mock).mockResolvedValue([
                    { id: '509658', name: 'Just Chatting' }
                ]);

                const result = await dispatcher.dispatchToTwitch('set-stream-category', request);

                expect(mockModules.twitchApi.categories.searchCategories).toHaveBeenCalledWith('Just Chatting');
                expect(mockModules.twitchApi.channels.updateChannelInformation).toHaveBeenCalledWith({
                    gameId: '509658'
                });
                expect(result).toEqual({ success: true });
            });

            it('should handle category not found', async () => {
                const request: SetStreamCategoryRequest = { category: 'Unknown Game' };
                (mockModules.twitchApi.categories.searchCategories as jest.Mock).mockResolvedValue([]);

                const result = await dispatcher.dispatchToTwitch('set-stream-category', request);

                expect(result).toEqual({
                    success: false,
                    error: 'Game/Category not found: Unknown Game'
                });
            });

            it('should handle category update errors', async () => {
                const request: SetStreamCategoryRequest = { category: 'Just Chatting' };
                (mockModules.twitchApi.categories.searchCategories as jest.Mock).mockRejectedValue(
                    new Error('API error')
                );

                const result = await dispatcher.dispatchToTwitch('set-stream-category', request);

                expect(result).toEqual({ success: false, error: 'API error' });
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
            (mockModules.frontendCommunicator.fireEventAsync as jest.Mock).mockResolvedValue({
                success: true
            });

            const result = await dispatcher.dispatchToIntegration('kick', 'send-chat-message', request);

            expect(mockModules.frontendCommunicator.fireEventAsync).toHaveBeenCalledWith(
                'mage-kick-integration:send-chat-message',
                request
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
            (mockModules.frontendCommunicator.fireEventAsync as jest.Mock).mockRejectedValue(
                new Error('IPC failed')
            );

            await expect(
                dispatcher.dispatchToIntegration('kick', 'send-chat-message', request)
            ).rejects.toThrow('IPC failed');

            expect(mockLogger.error).toHaveBeenCalled();
        });

        it('should timeout if IPC takes too long', async () => {
            const request: SendChatMessageRequest = { message: 'Hello' };

            (mockIntegrationDetector.isIntegrationDetected as jest.Mock).mockReturnValue(true);
            (mockIntegrationDetector.getDetectedIntegrationInfo as jest.Mock).mockReturnValue({
                scriptName: 'Kick Integration',
                version: '0.6.2'
            });

            // Mock a delayed response
            (mockModules.frontendCommunicator.fireEventAsync as jest.Mock).mockImplementation(
                () => new Promise((resolve) => {
                    setTimeout(() => {
                        resolve({ success: true });
                    }, 15000);
                })
            );

            await expect(
                dispatcher.dispatchToIntegration('kick', 'send-chat-message', request)
            ).rejects.toThrow('IPC timeout');
        }, 12000); // Extend test timeout

        it('should dispatch to YouTube integration', async () => {
            const request: SendChatMessageRequest = { message: 'Hello YouTube' };

            (mockIntegrationDetector.isIntegrationDetected as jest.Mock).mockReturnValue(true);
            (mockIntegrationDetector.getDetectedIntegrationInfo as jest.Mock).mockReturnValue({
                scriptName: 'YouTube Integration',
                version: '0.0.1'
            });
            (mockModules.frontendCommunicator.fireEventAsync as jest.Mock).mockResolvedValue({
                success: true
            });

            const result = await dispatcher.dispatchToIntegration('youtube', 'send-chat-message', request);

            expect(mockModules.frontendCommunicator.fireEventAsync).toHaveBeenCalledWith(
                'mage-youtube-integration:send-chat-message',
                request
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
