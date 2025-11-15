/* eslint-disable @typescript-eslint/unbound-method */
import { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import { IntegrationDetector } from '../../integration-detector';
import { PlatformDispatcher } from '../../platform-dispatcher';
import { LogWrapper } from '../../main';
import {
    createChatPlatformEffect,
    ChatPlatformEffectModel,
    determinePlatformTargets,
    getMessageForPlatform,
    getReplyIdForPlatform
} from '../chat-platform';

describe('chat-platform effect', () => {
    let mockIntegrationDetector: jest.Mocked<IntegrationDetector>;
    let mockDispatcher: jest.Mocked<PlatformDispatcher>;
    let mockFrontendCommunicator: { fireEventAsync: jest.Mock };
    let mockLogger: Partial<LogWrapper>;

    beforeEach(() => {
        mockIntegrationDetector = {
            isIntegrationDetected: jest.fn()
        } as unknown as jest.Mocked<IntegrationDetector>;

        mockDispatcher = {
            dispatch: jest.fn().mockResolvedValue({ success: true })
        } as unknown as jest.Mocked<PlatformDispatcher>;

        mockFrontendCommunicator = {
            fireEventAsync: jest.fn()
        };

        mockLogger = {
            debug: jest.fn(),
            error: jest.fn(),
            info: jest.fn(),
            warn: jest.fn()
        };
    });

    describe('onTriggerEvent', () => {
        it('should send to Twitch when triggered from Twitch with onTrigger mode', async () => {
            mockIntegrationDetector.isIntegrationDetected.mockReturnValue(false);

            const effect = createChatPlatformEffect(
                mockIntegrationDetector,
                mockDispatcher,
                mockFrontendCommunicator as any,
                mockLogger as LogWrapper
            );

            const effectModel: ChatPlatformEffectModel = {
                twitchMessage: 'Hello Twitch!',
                twitchSend: 'onTrigger',
                twitchReply: false,
                kickMessage: '',
                kickSend: 'never',
                kickReply: false,
                youtubeMessage: '',
                youtubeSend: 'never',
                youtubeReply: false,
                unknownSend: 'none'
            };

            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser',
                    platform: 'twitch'
                }
            };

            await effect.onTriggerEvent({
                effect: effectModel,
                trigger,
                sendDataToOverlay: jest.fn(),
                abortSignal: new AbortController().signal
            });

            expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
                'twitch',
                'send-chat-message',
                { message: 'Hello Twitch!', replyId: undefined }
            );
        });

        it('should send to Kick when triggered from Kick with onTrigger mode', async () => {
            mockIntegrationDetector.isIntegrationDetected.mockImplementation(platform => platform === 'kick');

            const effect = createChatPlatformEffect(
                mockIntegrationDetector,
                mockDispatcher,
                mockFrontendCommunicator as any,
                mockLogger as LogWrapper
            );

            const effectModel: ChatPlatformEffectModel = {
                twitchMessage: 'Hello Twitch!',
                twitchSend: 'never',
                twitchReply: false,
                kickMessage: 'Hello Kick!',
                kickSend: 'onTrigger',
                kickReply: false,
                youtubeMessage: '',
                youtubeSend: 'never',
                youtubeReply: false,
                unknownSend: 'none'
            };

            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser@kick',
                    platform: 'kick'
                }
            };

            await effect.onTriggerEvent({
                effect: effectModel,
                trigger,
                sendDataToOverlay: jest.fn(),
                abortSignal: new AbortController().signal
            });

            expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
                'kick',
                'send-chat-message',
                { message: 'Hello Kick!', replyId: undefined }
            );
        });

        it('should send to YouTube when triggered from YouTube with onTrigger mode', async () => {
            mockIntegrationDetector.isIntegrationDetected.mockImplementation(platform => platform === 'youtube');

            const effect = createChatPlatformEffect(
                mockIntegrationDetector,
                mockDispatcher,
                mockFrontendCommunicator as any,
                mockLogger as LogWrapper
            );

            const effectModel: ChatPlatformEffectModel = {
                twitchMessage: 'Hello Twitch!',
                twitchSend: 'never',
                twitchReply: false,
                kickMessage: '',
                kickSend: 'never',
                kickReply: false,
                youtubeMessage: 'Hello YouTube!',
                youtubeSend: 'onTrigger',
                youtubeReply: false,
                unknownSend: 'none'
            };

            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser@youtube',
                    platform: 'youtube'
                }
            };

            await effect.onTriggerEvent({
                effect: effectModel,
                trigger,
                sendDataToOverlay: jest.fn(),
                abortSignal: new AbortController().signal
            });

            expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
                'youtube',
                'send-chat-message',
                { message: 'Hello YouTube!', replyId: undefined }
            );
        });

        it('should send to all platforms with always mode', async () => {
            mockIntegrationDetector.isIntegrationDetected.mockReturnValue(true);

            const effect = createChatPlatformEffect(
                mockIntegrationDetector,
                mockDispatcher,
                mockFrontendCommunicator as any,
                mockLogger as LogWrapper
            );

            const effectModel: ChatPlatformEffectModel = {
                twitchMessage: 'Hello Twitch!',
                twitchSend: 'always',
                twitchReply: false,
                kickMessage: 'Hello Kick!',
                kickSend: 'always',
                kickReply: false,
                youtubeMessage: 'Hello YouTube!',
                youtubeSend: 'always',
                youtubeReply: false,
                unknownSend: 'none'
            };

            const trigger: Trigger = {
                type: 'manual',
                metadata: {
                    username: 'testuser'
                }
            };

            await effect.onTriggerEvent({
                effect: effectModel,
                trigger,
                sendDataToOverlay: jest.fn(),
                abortSignal: new AbortController().signal
            });

            expect(mockDispatcher.dispatch).toHaveBeenCalledTimes(3);
            expect(mockDispatcher.dispatch).toHaveBeenCalledWith('twitch', 'send-chat-message', expect.any(Object));
            expect(mockDispatcher.dispatch).toHaveBeenCalledWith('kick', 'send-chat-message', expect.any(Object));
            expect(mockDispatcher.dispatch).toHaveBeenCalledWith('youtube', 'send-chat-message', expect.any(Object));
        });

        it('should handle unknown platform by sending to Twitch when configured', async () => {
            mockIntegrationDetector.isIntegrationDetected.mockReturnValue(false);

            const effect = createChatPlatformEffect(
                mockIntegrationDetector,
                mockDispatcher,
                mockFrontendCommunicator as any,
                mockLogger as LogWrapper
            );

            const effectModel: ChatPlatformEffectModel = {
                twitchMessage: 'Hello from unknown!',
                twitchSend: 'never',
                twitchReply: false,
                kickMessage: '',
                kickSend: 'never',
                kickReply: false,
                youtubeMessage: '',
                youtubeSend: 'never',
                youtubeReply: false,
                unknownSend: 'twitch'
            };

            const trigger: Trigger = {
                type: 'manual',
                metadata: {
                    username: 'testuser'
                }
            };

            await effect.onTriggerEvent({
                effect: effectModel,
                trigger,
                sendDataToOverlay: jest.fn(),
                abortSignal: new AbortController().signal
            });

            expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
                'twitch',
                'send-chat-message',
                { message: 'Hello from unknown!', replyId: undefined }
            );
        });

        it('should not send when unknown platform and unknownSend is none', async () => {
            mockIntegrationDetector.isIntegrationDetected.mockReturnValue(false);

            const effect = createChatPlatformEffect(
                mockIntegrationDetector,
                mockDispatcher,
                mockFrontendCommunicator as any,
                mockLogger as LogWrapper
            );

            const effectModel: ChatPlatformEffectModel = {
                twitchMessage: 'Hello!',
                twitchSend: 'never',
                twitchReply: false,
                kickMessage: '',
                kickSend: 'never',
                kickReply: false,
                youtubeMessage: '',
                youtubeSend: 'never',
                youtubeReply: false,
                unknownSend: 'none'
            };

            const trigger: Trigger = {
                type: 'manual',
                metadata: {
                    username: 'testuser'
                }
            };

            await effect.onTriggerEvent({
                effect: effectModel,
                trigger,
                sendDataToOverlay: jest.fn(),
                abortSignal: new AbortController().signal
            });

            expect(mockDispatcher.dispatch).not.toHaveBeenCalled();
        });

        it('should include reply ID when reply is enabled', async () => {
            mockIntegrationDetector.isIntegrationDetected.mockReturnValue(false);

            const effect = createChatPlatformEffect(
                mockIntegrationDetector,
                mockDispatcher,
                mockFrontendCommunicator as any,
                mockLogger as LogWrapper
            );

            const effectModel: ChatPlatformEffectModel = {
                twitchMessage: 'Reply message',
                twitchSend: 'onTrigger',
                twitchReply: true,
                kickMessage: '',
                kickSend: 'never',
                kickReply: false,
                youtubeMessage: '',
                youtubeSend: 'never',
                youtubeReply: false,
                unknownSend: 'none'
            };

            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser',
                    platform: 'twitch',
                    chatMessage: {
                        messageId: 'msg-123',
                        username: 'testuser'
                    }
                }
            };

            await effect.onTriggerEvent({
                effect: effectModel,
                trigger,
                sendDataToOverlay: jest.fn(),
                abortSignal: new AbortController().signal
            });

            expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
                'twitch',
                'send-chat-message',
                { message: 'Reply message', replyId: 'msg-123' }
            );
        });

        it('should continue sending to other platforms if one fails', async () => {
            mockIntegrationDetector.isIntegrationDetected.mockReturnValue(true);

            const effect = createChatPlatformEffect(
                mockIntegrationDetector,
                mockDispatcher,
                mockFrontendCommunicator as any,
                mockLogger as LogWrapper
            );

            // Mock kick to fail, others to succeed
            mockDispatcher.dispatch.mockImplementation((platform) => {
                if (platform === 'kick') {
                    return Promise.reject(new Error('Kick API error'));
                }
                return Promise.resolve({ success: true });
            });

            const effectModel: ChatPlatformEffectModel = {
                twitchMessage: 'Hello Twitch!',
                twitchSend: 'always',
                twitchReply: false,
                kickMessage: 'Hello Kick!',
                kickSend: 'always',
                kickReply: false,
                youtubeMessage: 'Hello YouTube!',
                youtubeSend: 'always',
                youtubeReply: false,
                unknownSend: 'none'
            };

            const trigger: Trigger = {
                type: 'manual',
                metadata: {
                    username: 'testuser'
                }
            };

            await effect.onTriggerEvent({
                effect: effectModel,
                trigger,
                sendDataToOverlay: jest.fn(),
                abortSignal: new AbortController().signal
            });

            expect(mockDispatcher.dispatch).toHaveBeenCalledTimes(3);
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to send message to kick'));
        });
    });

    describe('determinePlatformTargets', () => {
        it('should return Twitch for Twitch trigger with onTrigger mode', () => {
            mockIntegrationDetector.isIntegrationDetected.mockReturnValue(false);

            const effect: ChatPlatformEffectModel = {
                twitchMessage: 'test',
                twitchSend: 'onTrigger',
                twitchReply: false,
                kickMessage: '',
                kickSend: 'never',
                kickReply: false,
                youtubeMessage: '',
                youtubeSend: 'never',
                youtubeReply: false,
                unknownSend: 'none'
            };

            const targets = determinePlatformTargets('twitch', effect, mockIntegrationDetector);

            expect(targets).toEqual(['twitch']);
        });

        it('should return all platforms with always mode', () => {
            mockIntegrationDetector.isIntegrationDetected.mockReturnValue(true);

            const effect: ChatPlatformEffectModel = {
                twitchMessage: 'test',
                twitchSend: 'always',
                twitchReply: false,
                kickMessage: 'test',
                kickSend: 'always',
                kickReply: false,
                youtubeMessage: 'test',
                youtubeSend: 'always',
                youtubeReply: false,
                unknownSend: 'none'
            };

            const targets = determinePlatformTargets('kick', effect, mockIntegrationDetector);

            expect(targets).toEqual(['twitch', 'kick', 'youtube']);
        });

        it('should not include Kick if integration is not detected', () => {
            mockIntegrationDetector.isIntegrationDetected.mockReturnValue(false);

            const effect: ChatPlatformEffectModel = {
                twitchMessage: 'test',
                twitchSend: 'never',
                twitchReply: false,
                kickMessage: 'test',
                kickSend: 'always',
                kickReply: false,
                youtubeMessage: '',
                youtubeSend: 'never',
                youtubeReply: false,
                unknownSend: 'none'
            };

            const targets = determinePlatformTargets('kick', effect, mockIntegrationDetector);

            expect(targets).toEqual([]);
        });
    });

    describe('getMessageForPlatform', () => {
        it('should return Kick message for Kick platform', () => {
            const effect: ChatPlatformEffectModel = {
                twitchMessage: 'Twitch message',
                twitchSend: 'never',
                twitchReply: false,
                kickMessage: 'Kick message',
                kickSend: 'never',
                kickReply: false,
                youtubeMessage: 'YouTube message',
                youtubeSend: 'never',
                youtubeReply: false,
                unknownSend: 'none'
            };

            const message = getMessageForPlatform('kick', effect);

            expect(message).toBe('Kick message');
        });

        it('should return YouTube message for YouTube platform', () => {
            const effect: ChatPlatformEffectModel = {
                twitchMessage: 'Twitch message',
                twitchSend: 'never',
                twitchReply: false,
                kickMessage: 'Kick message',
                kickSend: 'never',
                kickReply: false,
                youtubeMessage: 'YouTube message',
                youtubeSend: 'never',
                youtubeReply: false,
                unknownSend: 'none'
            };

            const message = getMessageForPlatform('youtube', effect);

            expect(message).toBe('YouTube message');
        });

        it('should return Twitch message for Twitch platform', () => {
            const effect: ChatPlatformEffectModel = {
                twitchMessage: 'Twitch message',
                twitchSend: 'never',
                twitchReply: false,
                kickMessage: 'Kick message',
                kickSend: 'never',
                kickReply: false,
                youtubeMessage: 'YouTube message',
                youtubeSend: 'never',
                youtubeReply: false,
                unknownSend: 'none'
            };

            const message = getMessageForPlatform('twitch', effect);

            expect(message).toBe('Twitch message');
        });
    });

    describe('getReplyIdForPlatform', () => {
        it('should return reply ID from chatMessage.messageId when reply is enabled', () => {
            const effect: ChatPlatformEffectModel = {
                twitchMessage: 'test',
                twitchSend: 'never',
                twitchReply: true,
                kickMessage: '',
                kickSend: 'never',
                kickReply: false,
                youtubeMessage: '',
                youtubeSend: 'never',
                youtubeReply: false,
                unknownSend: 'none'
            };

            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser',
                    chatMessage: {
                        messageId: 'msg-123',
                        username: 'testuser'
                    }
                }
            };

            const replyId = getReplyIdForPlatform('twitch', trigger, effect);

            expect(replyId).toBe('msg-123');
        });

        it('should return undefined when reply is disabled', () => {
            const effect: ChatPlatformEffectModel = {
                twitchMessage: 'test',
                twitchSend: 'never',
                twitchReply: false,
                kickMessage: '',
                kickSend: 'never',
                kickReply: false,
                youtubeMessage: '',
                youtubeSend: 'never',
                youtubeReply: false,
                unknownSend: 'none'
            };

            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser',
                    chatMessage: {
                        messageId: 'msg-123',
                        username: 'testuser'
                    }
                }
            };

            const replyId = getReplyIdForPlatform('twitch', trigger, effect);

            expect(replyId).toBeUndefined();
        });

        it('should return reply ID from eventData.messageId', () => {
            const effect: ChatPlatformEffectModel = {
                twitchMessage: 'test',
                twitchSend: 'never',
                twitchReply: false,
                kickMessage: 'test',
                kickSend: 'never',
                kickReply: true,
                youtubeMessage: '',
                youtubeSend: 'never',
                youtubeReply: false,
                unknownSend: 'none'
            };

            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser',
                    eventData: {
                        messageId: 'evt-456'
                    }
                }
            };

            const replyId = getReplyIdForPlatform('kick', trigger, effect);

            expect(replyId).toBe('evt-456');
        });

        it('should return undefined when no message ID is available', () => {
            const effect: ChatPlatformEffectModel = {
                twitchMessage: 'test',
                twitchSend: 'never',
                twitchReply: true,
                kickMessage: '',
                kickSend: 'never',
                kickReply: false,
                youtubeMessage: '',
                youtubeSend: 'never',
                youtubeReply: false,
                unknownSend: 'none'
            };

            const trigger: Trigger = {
                type: 'manual',
                metadata: {
                    username: 'testuser'
                }
            };

            const replyId = getReplyIdForPlatform('twitch', trigger, effect);

            expect(replyId).toBeUndefined();
        });
    });
});
