/* eslint-disable @typescript-eslint/unbound-method */
import { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import { IntegrationDetector } from '../../integration-detector';
import { PlatformDispatcher } from '../../platform-dispatcher';

// Mock the main module before importing the effect
const mockIntegrationDetector = {
    isIntegrationDetected: jest.fn()
} as unknown as jest.Mocked<IntegrationDetector>;

const mockDispatcher = {
    dispatchOperation: jest.fn().mockResolvedValue({ success: true })
} as unknown as jest.Mocked<PlatformDispatcher>;

const mockLogger = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
};

jest.mock('../../main', () => ({
    logger: mockLogger,
    platformLib: {
        integrationDetector: mockIntegrationDetector,
        platformDispatcher: mockDispatcher
    }
}));

import {
    chatPlatformEffect,
    ChatPlatformEffectModel,
    determinePlatformTargets,
    getMessageForPlatform,
    getReplyIdForPlatform,
    getChatterForPlatform
} from '../chat-platform';

describe('chat-platform effect', () => {
    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();
    });

    describe('optionsValidator', () => {
        const validator = chatPlatformEffect.optionsValidator as (effect: ChatPlatformEffectModel) => string[];

        it('should require at least one platform to be enabled', () => {
            const effect: ChatPlatformEffectModel = {
                twitchMessage: '',
                twitchSend: 'never',
                twitchReply: false,
                twitchChatter: 'Streamer',
                twitchEnabled: false,
                kickMessage: '',
                kickSend: 'never',
                kickReply: false,
                kickChatter: 'Streamer',
                kickEnabled: false,
                youtubeMessage: '',
                youtubeSend: 'never',
                youtubeReply: false,
                youtubeChatter: 'Streamer',
                youtubeEnabled: false,
                unknownSendTwitch: false,
                unknownSendKick: false,
                unknownSendYouTube: false
            };

            const errors = validator(effect);

            expect(errors).toContain('At least one platform must be enabled');
        });

        it('should not require at least one platform error when at least one is enabled', () => {
            const effect: ChatPlatformEffectModel = {
                twitchMessage: 'Hello',
                twitchSend: 'onTrigger',
                twitchReply: false,
                twitchChatter: 'Streamer',
                twitchEnabled: true,
                kickMessage: '',
                kickSend: 'never',
                kickReply: false,
                kickChatter: 'Streamer',
                kickEnabled: false,
                youtubeMessage: '',
                youtubeSend: 'never',
                youtubeReply: false,
                youtubeChatter: 'Streamer',
                youtubeEnabled: false,
                unknownSendTwitch: false,
                unknownSendKick: false,
                unknownSendYouTube: false
            };

            const errors = validator(effect);

            expect(errors).not.toContain('At least one platform must be enabled');
        });
    });

    describe('onTriggerEvent', () => {
        it('should send to Twitch when triggered from Twitch with onTrigger mode', async () => {
            mockIntegrationDetector.isIntegrationDetected.mockReturnValue(false);

            const effect = chatPlatformEffect;

            const effectModel: ChatPlatformEffectModel = {
                twitchMessage: 'Hello Twitch!',
                twitchSend: 'onTrigger',
                twitchReply: false,
                twitchChatter: 'Streamer',
                twitchEnabled: true,
                kickMessage: '',
                kickSend: 'never',
                kickReply: false,
                kickChatter: 'Streamer',
                kickEnabled: false,
                youtubeMessage: '',
                youtubeSend: 'never',
                youtubeReply: false,
                youtubeChatter: 'Streamer',
                youtubeEnabled: false,
                unknownSendTwitch: false,
                unknownSendKick: false,
                unknownSendYouTube: false
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

            expect(mockDispatcher.dispatchOperation).toHaveBeenCalledWith(
                'send-chat-message',
                'twitch',
                { message: 'Hello Twitch!', chatter: 'Streamer', replyId: undefined }
            );
        });

        it('should send to Kick when triggered from Kick with onTrigger mode', async () => {
            mockIntegrationDetector.isIntegrationDetected.mockImplementation(platform => platform === 'kick');

            const effect = chatPlatformEffect;

            const effectModel: ChatPlatformEffectModel = {
                twitchMessage: 'Hello Twitch!',
                twitchSend: 'never',
                twitchReply: false,
                twitchChatter: 'Streamer',
                twitchEnabled: false,
                kickMessage: 'Hello Kick!',
                kickSend: 'onTrigger',
                kickReply: false,
                kickChatter: 'Streamer',
                kickEnabled: true,
                youtubeMessage: '',
                youtubeSend: 'never',
                youtubeReply: false,
                youtubeChatter: 'Streamer',
                youtubeEnabled: false,
                unknownSendTwitch: false,
                unknownSendKick: false,
                unknownSendYouTube: false
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

            expect(mockDispatcher.dispatchOperation).toHaveBeenCalledWith(
                'send-chat-message',
                'kick',
                { message: 'Hello Kick!', chatter: 'Streamer', replyId: undefined }
            );
        });

        it('should send to YouTube when triggered from YouTube with onTrigger mode', async () => {
            mockIntegrationDetector.isIntegrationDetected.mockImplementation(platform => platform === 'youtube');

            const effect = chatPlatformEffect;

            const effectModel: ChatPlatformEffectModel = {
                twitchMessage: 'Hello Twitch!',
                twitchSend: 'never',
                twitchReply: false,
                twitchChatter: 'Streamer',
                twitchEnabled: false,
                kickMessage: '',
                kickSend: 'never',
                kickReply: false,
                kickChatter: 'Streamer',
                kickEnabled: false,
                youtubeMessage: 'Hello YouTube!',
                youtubeSend: 'onTrigger',
                youtubeReply: false,
                youtubeChatter: 'Streamer',
                youtubeEnabled: true,
                unknownSendTwitch: false,
                unknownSendKick: false,
                unknownSendYouTube: false
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

            expect(mockDispatcher.dispatchOperation).toHaveBeenCalledWith(
                'send-chat-message',
                'youtube',
                { message: 'Hello YouTube!', chatter: 'Streamer', replyId: undefined }
            );
        });

        it('should send to all platforms with always mode', async () => {
            mockIntegrationDetector.isIntegrationDetected.mockReturnValue(true);

            const effect = chatPlatformEffect;

            const effectModel: ChatPlatformEffectModel = {
                twitchMessage: 'Hello Twitch!',
                twitchSend: 'always',
                twitchReply: false,
                twitchChatter: 'Streamer',
                twitchEnabled: true,
                kickMessage: 'Hello Kick!',
                kickSend: 'always',
                kickReply: false,
                kickChatter: 'Streamer',
                kickEnabled: true,
                youtubeMessage: 'Hello YouTube!',
                youtubeSend: 'always',
                youtubeReply: false,
                youtubeChatter: 'Streamer',
                youtubeEnabled: true,
                unknownSendTwitch: false,
                unknownSendKick: false,
                unknownSendYouTube: false
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

            expect(mockDispatcher.dispatchOperation).toHaveBeenCalledTimes(3);
            expect(mockDispatcher.dispatchOperation).toHaveBeenCalledWith('send-chat-message', 'twitch', expect.any(Object));
            expect(mockDispatcher.dispatchOperation).toHaveBeenCalledWith('send-chat-message', 'kick', expect.any(Object));
            expect(mockDispatcher.dispatchOperation).toHaveBeenCalledWith('send-chat-message', 'youtube', expect.any(Object));
        });

        it('should handle unknown platform by sending to Twitch when configured', async () => {
            mockIntegrationDetector.isIntegrationDetected.mockReturnValue(false);

            const effect = chatPlatformEffect;

            const effectModel: ChatPlatformEffectModel = {
                twitchMessage: 'Hello from unknown!',
                twitchSend: 'never',
                twitchReply: false,
                twitchChatter: 'Streamer',
                twitchEnabled: true,
                kickMessage: '',
                kickSend: 'never',
                kickReply: false,
                kickChatter: 'Streamer',
                kickEnabled: false,
                youtubeMessage: '',
                youtubeSend: 'never',
                youtubeReply: false,
                youtubeChatter: 'Streamer',
                youtubeEnabled: false,
                unknownSendTwitch: true,
                unknownSendKick: false,
                unknownSendYouTube: false
            };

            const trigger: Trigger = {
                type: 'manual',
                metadata: {
                    username: undefined,
                    eventSource: undefined,
                    eventData: undefined,
                    chatMessage: undefined
                }
            } as unknown as Trigger;

            await effect.onTriggerEvent({
                effect: effectModel,
                trigger,
                sendDataToOverlay: jest.fn(),
                abortSignal: new AbortController().signal
            });

            expect(mockDispatcher.dispatchOperation).toHaveBeenCalledWith(
                'send-chat-message',
                'twitch',
                { message: 'Hello from unknown!', chatter: 'Streamer', replyId: undefined }
            );
        });

        it('should not send when unknown platform and all unknown options are false', async () => {
            mockIntegrationDetector.isIntegrationDetected.mockReturnValue(false);

            const effect = chatPlatformEffect;

            const effectModel: ChatPlatformEffectModel = {
                twitchMessage: 'Hello!',
                twitchSend: 'never',
                twitchReply: false,
                twitchChatter: 'Streamer',
                twitchEnabled: true,
                kickMessage: '',
                kickSend: 'never',
                kickReply: false,
                kickChatter: 'Streamer',
                kickEnabled: false,
                youtubeMessage: '',
                youtubeSend: 'never',
                youtubeReply: false,
                youtubeChatter: 'Streamer',
                youtubeEnabled: false,
                unknownSendTwitch: false,
                unknownSendKick: false,
                unknownSendYouTube: false
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

            expect(mockDispatcher.dispatchOperation).not.toHaveBeenCalled();
        });

        it('should include reply ID when reply is enabled', async () => {
            mockIntegrationDetector.isIntegrationDetected.mockReturnValue(false);

            const effect = chatPlatformEffect;

            const effectModel: ChatPlatformEffectModel = {
                twitchMessage: 'Reply message',
                twitchSend: 'onTrigger',
                twitchReply: true,
                twitchChatter: 'Streamer',
                twitchEnabled: true,
                kickMessage: '',
                kickSend: 'never',
                kickReply: false,
                kickChatter: 'Streamer',
                kickEnabled: false,
                youtubeMessage: '',
                youtubeSend: 'never',
                youtubeReply: false,
                youtubeChatter: 'Streamer',
                youtubeEnabled: false,
                unknownSendTwitch: false,
                unknownSendKick: false,
                unknownSendYouTube: false
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

            expect(mockDispatcher.dispatchOperation).toHaveBeenCalledWith(
                'send-chat-message',
                'twitch',
                { message: 'Reply message', chatter: 'Streamer', replyId: 'msg-123' }
            );
        });

        it('should continue sending to other platforms if one fails', async () => {
            mockIntegrationDetector.isIntegrationDetected.mockReturnValue(true);

            const effect = chatPlatformEffect;

            // Mock kick to fail, others to succeed
            mockDispatcher.dispatchOperation.mockImplementation((operation, platform) => {
                if (platform === 'kick') {
                    return Promise.reject(new Error('Kick API error'));
                }
                return Promise.resolve({ success: true });
            });

            const effectModel: ChatPlatformEffectModel = {
                twitchMessage: 'Hello Twitch!',
                twitchSend: 'always',
                twitchReply: false,
                twitchChatter: 'Streamer',
                twitchEnabled: true,
                kickMessage: 'Hello Kick!',
                kickSend: 'always',
                kickReply: false,
                kickChatter: 'Streamer',
                kickEnabled: true,
                youtubeMessage: 'Hello YouTube!',
                youtubeSend: 'always',
                youtubeReply: false,
                youtubeChatter: 'Streamer',
                youtubeEnabled: true,
                unknownSendTwitch: false,
                unknownSendKick: false,
                unknownSendYouTube: false
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

            expect(mockDispatcher.dispatchOperation).toHaveBeenCalledTimes(3);
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
                twitchChatter: 'Streamer',
                twitchEnabled: true,
                kickMessage: '',
                kickSend: 'never',
                kickReply: false,
                kickChatter: 'Streamer',
                kickEnabled: false,
                youtubeMessage: '',
                youtubeSend: 'never',
                youtubeReply: false,
                youtubeChatter: 'Streamer',
                youtubeEnabled: false,
                unknownSendTwitch: false,
                unknownSendKick: false,
                unknownSendYouTube: false
            };

            const targets = determinePlatformTargets('twitch', effect);

            expect(targets).toEqual(['twitch']);
        });

        it('should return all platforms with always mode', () => {
            mockIntegrationDetector.isIntegrationDetected.mockReturnValue(true);

            const effect: ChatPlatformEffectModel = {
                twitchMessage: 'test',
                twitchSend: 'always',
                twitchReply: false,
                twitchChatter: 'Streamer',
                twitchEnabled: true,
                kickMessage: 'test',
                kickSend: 'always',
                kickReply: false,
                kickChatter: 'Streamer',
                kickEnabled: true,
                youtubeMessage: 'test',
                youtubeSend: 'always',
                youtubeReply: false,
                youtubeChatter: 'Streamer',
                youtubeEnabled: true,
                unknownSendTwitch: false,
                unknownSendKick: false,
                unknownSendYouTube: false
            };

            const targets = determinePlatformTargets('kick', effect);

            expect(targets).toEqual(['twitch', 'kick', 'youtube']);
        });

        it('should not include Kick if integration is not detected', () => {
            mockIntegrationDetector.isIntegrationDetected.mockReturnValue(false);

            const effect: ChatPlatformEffectModel = {
                twitchMessage: 'test',
                twitchSend: 'never',
                twitchReply: false,
                twitchChatter: 'Streamer',
                twitchEnabled: false,
                kickMessage: 'test',
                kickSend: 'always',
                kickReply: false,
                kickChatter: 'Streamer',
                kickEnabled: true,
                youtubeMessage: '',
                youtubeSend: 'never',
                youtubeReply: false,
                youtubeChatter: 'Streamer',
                youtubeEnabled: false,
                unknownSendTwitch: false,
                unknownSendKick: false,
                unknownSendYouTube: false
            };

            const targets = determinePlatformTargets('kick', effect);

            expect(targets).toEqual([]);
        });
    });

    describe('getMessageForPlatform', () => {
        it('should return Kick message for Kick platform', () => {
            const effect: ChatPlatformEffectModel = {
                twitchMessage: 'Twitch message',
                twitchSend: 'never',
                twitchReply: false,
                twitchChatter: 'Streamer',
                twitchEnabled: true,
                kickMessage: 'Kick message',
                kickSend: 'never',
                kickReply: false,
                kickChatter: 'Streamer',
                kickEnabled: true,
                youtubeMessage: 'YouTube message',
                youtubeSend: 'never',
                youtubeReply: false,
                youtubeChatter: 'Streamer',
                youtubeEnabled: true,
                unknownSendTwitch: false,
                unknownSendKick: false,
                unknownSendYouTube: false
            };

            const message = getMessageForPlatform('kick', effect);

            expect(message).toBe('Kick message');
        });

        it('should return YouTube message for YouTube platform', () => {
            const effect: ChatPlatformEffectModel = {
                twitchMessage: 'Twitch message',
                twitchSend: 'never',
                twitchReply: false,
                twitchChatter: 'Streamer',
                twitchEnabled: true,
                kickMessage: 'Kick message',
                kickSend: 'never',
                kickReply: false,
                kickChatter: 'Streamer',
                kickEnabled: true,
                youtubeMessage: 'YouTube message',
                youtubeSend: 'never',
                youtubeReply: false,
                youtubeChatter: 'Streamer',
                youtubeEnabled: true,
                unknownSendTwitch: false,
                unknownSendKick: false,
                unknownSendYouTube: false
            };

            const message = getMessageForPlatform('youtube', effect);

            expect(message).toBe('YouTube message');
        });

        it('should return Twitch message for Twitch platform', () => {
            const effect: ChatPlatformEffectModel = {
                twitchMessage: 'Twitch message',
                twitchSend: 'never',
                twitchReply: false,
                twitchChatter: 'Streamer',
                twitchEnabled: true,
                kickMessage: 'Kick message',
                kickSend: 'never',
                kickReply: false,
                kickChatter: 'Streamer',
                kickEnabled: true,
                youtubeMessage: 'YouTube message',
                youtubeSend: 'never',
                youtubeReply: false,
                youtubeChatter: 'Streamer',
                youtubeEnabled: true,
                unknownSendTwitch: false,
                unknownSendKick: false,
                unknownSendYouTube: false
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
                twitchChatter: 'Streamer',
                twitchEnabled: true,
                kickMessage: '',
                kickSend: 'never',
                kickReply: false,
                kickChatter: 'Streamer',
                kickEnabled: false,
                youtubeMessage: '',
                youtubeSend: 'never',
                youtubeReply: false,
                youtubeChatter: 'Streamer',
                youtubeEnabled: false,
                unknownSendTwitch: false,
                unknownSendKick: false,
                unknownSendYouTube: false
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
                twitchChatter: 'Streamer',
                twitchEnabled: true,
                kickMessage: '',
                kickSend: 'never',
                kickReply: false,
                kickChatter: 'Streamer',
                kickEnabled: false,
                youtubeMessage: '',
                youtubeSend: 'never',
                youtubeReply: false,
                youtubeChatter: 'Streamer',
                youtubeEnabled: false,
                unknownSendTwitch: false,
                unknownSendKick: false,
                unknownSendYouTube: false
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
                twitchChatter: 'Streamer',
                twitchEnabled: false,
                kickMessage: 'test',
                kickSend: 'never',
                kickReply: true,
                kickChatter: 'Streamer',
                kickEnabled: true,
                youtubeMessage: '',
                youtubeSend: 'never',
                youtubeReply: false,
                youtubeChatter: 'Streamer',
                youtubeEnabled: false,
                unknownSendTwitch: false,
                unknownSendKick: false,
                unknownSendYouTube: false
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
                twitchChatter: 'Streamer',
                twitchEnabled: true,
                kickMessage: '',
                kickSend: 'never',
                kickReply: false,
                kickChatter: 'Streamer',
                kickEnabled: false,
                youtubeMessage: '',
                youtubeSend: 'never',
                youtubeReply: false,
                youtubeChatter: 'Streamer',
                youtubeEnabled: false,
                unknownSendTwitch: false,
                unknownSendKick: false,
                unknownSendYouTube: false
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

        it('should return undefined when metadata is null', () => {
            const effect: ChatPlatformEffectModel = {
                twitchMessage: 'test',
                twitchSend: 'never',
                twitchReply: true,
                twitchChatter: 'Streamer',
                twitchEnabled: true,
                kickMessage: '',
                kickSend: 'never',
                kickReply: false,
                kickChatter: 'Streamer',
                kickEnabled: false,
                youtubeMessage: '',
                youtubeSend: 'never',
                youtubeReply: false,
                youtubeChatter: 'Streamer',
                youtubeEnabled: false,
                unknownSendTwitch: false,
                unknownSendKick: false,
                unknownSendYouTube: false
            };

            const trigger: Trigger = {
                type: 'manual',
                metadata: null as any
            };

            const replyId = getReplyIdForPlatform('twitch', trigger, effect);

            expect(replyId).toBeUndefined();
        });

        it('should return reply ID from chatMessage.id when messageId is not available', () => {
            const effect: ChatPlatformEffectModel = {
                twitchMessage: 'test',
                twitchSend: 'never',
                twitchReply: true,
                twitchChatter: 'Streamer',
                twitchEnabled: true,
                kickMessage: '',
                kickSend: 'never',
                kickReply: false,
                kickChatter: 'Streamer',
                kickEnabled: false,
                youtubeMessage: '',
                youtubeSend: 'never',
                youtubeReply: false,
                youtubeChatter: 'Streamer',
                youtubeEnabled: false,
                unknownSendTwitch: false,
                unknownSendKick: false,
                unknownSendYouTube: false
            };

            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser',
                    chatMessage: {
                        id: 'msg-789',
                        username: 'testuser'
                    }
                }
            };

            const replyId = getReplyIdForPlatform('twitch', trigger, effect);

            expect(replyId).toBe('msg-789');
        });

        it('should return reply ID from eventData.id when messageId is not available', () => {
            const effect: ChatPlatformEffectModel = {
                twitchMessage: 'test',
                twitchSend: 'never',
                twitchReply: false,
                twitchChatter: 'Streamer',
                twitchEnabled: false,
                kickMessage: 'test',
                kickSend: 'never',
                kickReply: true,
                kickChatter: 'Streamer',
                kickEnabled: true,
                youtubeMessage: '',
                youtubeSend: 'never',
                youtubeReply: false,
                youtubeChatter: 'Streamer',
                youtubeEnabled: false,
                unknownSendTwitch: false,
                unknownSendKick: false,
                unknownSendYouTube: false
            };

            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser',
                    eventData: {
                        id: 'evt-999'
                    }
                }
            };

            const replyId = getReplyIdForPlatform('kick', trigger, effect);

            expect(replyId).toBe('evt-999');
        });
    });

    describe('getChatterForPlatform', () => {
        it('should return Kick chatter for Kick platform', () => {
            const effect: ChatPlatformEffectModel = {
                twitchMessage: 'test',
                twitchSend: 'never',
                twitchReply: false,
                twitchChatter: 'Streamer',
                twitchEnabled: true,
                kickMessage: 'test',
                kickSend: 'never',
                kickReply: false,
                kickChatter: 'Bot',
                kickEnabled: true,
                youtubeMessage: 'test',
                youtubeSend: 'never',
                youtubeReply: false,
                youtubeChatter: 'Streamer',
                youtubeEnabled: true,
                unknownSendTwitch: false,
                unknownSendKick: false,
                unknownSendYouTube: false
            };

            const chatter = getChatterForPlatform('kick', effect);

            expect(chatter).toBe('Bot');
        });

        it('should return YouTube chatter for YouTube platform', () => {
            const effect: ChatPlatformEffectModel = {
                twitchMessage: 'test',
                twitchSend: 'never',
                twitchReply: false,
                twitchChatter: 'Streamer',
                twitchEnabled: true,
                kickMessage: 'test',
                kickSend: 'never',
                kickReply: false,
                kickChatter: 'Streamer',
                kickEnabled: true,
                youtubeMessage: 'test',
                youtubeSend: 'never',
                youtubeReply: false,
                youtubeChatter: 'Streamer',
                youtubeEnabled: true,
                unknownSendTwitch: false,
                unknownSendKick: false,
                unknownSendYouTube: false
            };

            const chatter = getChatterForPlatform('youtube', effect);

            expect(chatter).toBe('Streamer');
        });

        it('should return Twitch chatter for Twitch platform', () => {
            const effect: ChatPlatformEffectModel = {
                twitchMessage: 'test',
                twitchSend: 'never',
                twitchReply: false,
                twitchChatter: 'Bot',
                twitchEnabled: true,
                kickMessage: 'test',
                kickSend: 'never',
                kickReply: false,
                kickChatter: 'Streamer',
                kickEnabled: true,
                youtubeMessage: 'test',
                youtubeSend: 'never',
                youtubeReply: false,
                youtubeChatter: 'Streamer',
                youtubeEnabled: true,
                unknownSendTwitch: false,
                unknownSendKick: false,
                unknownSendYouTube: false
            };

            const chatter = getChatterForPlatform('twitch', effect);

            expect(chatter).toBe('Bot');
        });

        it('should default to Streamer for Twitch when not specified', () => {
            const effect: ChatPlatformEffectModel = {
                twitchMessage: 'test',
                twitchSend: 'never',
                twitchReply: false,
                twitchChatter: undefined as any,
                twitchEnabled: true,
                kickMessage: 'test',
                kickSend: 'never',
                kickReply: false,
                kickChatter: 'Streamer',
                kickEnabled: true,
                youtubeMessage: 'test',
                youtubeSend: 'never',
                youtubeReply: false,
                youtubeChatter: 'Streamer',
                youtubeEnabled: true,
                unknownSendTwitch: false,
                unknownSendKick: false,
                unknownSendYouTube: false
            };

            const chatter = getChatterForPlatform('twitch', effect);

            expect(chatter).toBe('Streamer');
        });
    });
});
