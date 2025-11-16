/* eslint-disable @typescript-eslint/unbound-method */
import { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import { GetUserDisplayNameResponse } from '@thestaticmage/mage-platform-lib-client';
import { PlatformDispatcher } from '../../platform-dispatcher';
import { LogWrapper } from '../../main';
import { createPlatformAwareUserDisplayNameVariable } from '../platform-aware-user-display-name';

describe('platformAwareUserDisplayName variable', () => {
    let mockDispatcher: jest.Mocked<PlatformDispatcher>;
    let mockLogger: Partial<LogWrapper>;
    let variable: ReturnType<typeof createPlatformAwareUserDisplayNameVariable>;

    beforeEach(() => {
        mockDispatcher = {
            dispatchOperation: jest.fn()
        } as unknown as jest.Mocked<PlatformDispatcher>;

        mockLogger = {
            debug: jest.fn(),
            error: jest.fn(),
            info: jest.fn(),
            warn: jest.fn()
        };

        variable = createPlatformAwareUserDisplayNameVariable(mockDispatcher, mockLogger as LogWrapper);
    });

    describe('evaluator', () => {
        it('should get display name from Twitch platform', async () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser',
                    platform: 'twitch'
                }
            };

            mockDispatcher.dispatchOperation.mockResolvedValue({
                displayName: 'TestUser'
            } as GetUserDisplayNameResponse);

            const result = await variable.evaluator(trigger);

            expect(result).toBe('TestUser');
            expect(mockDispatcher.dispatchOperation).toHaveBeenCalledWith(
                'get-user-display-name',
                'twitch',
                { username: 'testuser' }
            );
        });

        it('should get display name from Kick platform', async () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'kickuser@kick',
                    eventData: {
                        platform: 'kick'
                    }
                }
            };

            mockDispatcher.dispatchOperation.mockResolvedValue({
                displayName: 'KickUser'
            } as GetUserDisplayNameResponse);

            const result = await variable.evaluator(trigger);

            expect(result).toBe('KickUser');
            expect(mockDispatcher.dispatchOperation).toHaveBeenCalledWith(
                'get-user-display-name',
                'kick',
                { username: 'kickuser@kick' }
            );
        });

        it('should get display name from YouTube platform', async () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'youtubeuser@youtube',
                    eventData: {
                        platform: 'youtube'
                    }
                }
            };

            mockDispatcher.dispatchOperation.mockResolvedValue({
                displayName: 'YouTubeUser'
            } as GetUserDisplayNameResponse);

            const result = await variable.evaluator(trigger);

            expect(result).toBe('YouTubeUser');
            expect(mockDispatcher.dispatchOperation).toHaveBeenCalledWith(
                'get-user-display-name',
                'youtube',
                { username: 'youtubeuser@youtube' }
            );
        });

        it('should use username argument when provided', async () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'triggeruser',
                    platform: 'twitch'
                }
            };

            mockDispatcher.dispatchOperation.mockResolvedValue({
                displayName: 'ArgumentUser'
            } as GetUserDisplayNameResponse);

            const result = await variable.evaluator(trigger, 'argumentuser');

            expect(result).toBe('ArgumentUser');
            expect(mockDispatcher.dispatchOperation).toHaveBeenCalledWith(
                'get-user-display-name',
                'twitch',
                { username: 'argumentuser' }
            );
        });

        it('should extract username from chatMessage', async () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'fallbackuser',
                    platform: 'kick',
                    chatMessage: {
                        username: 'chatuser@kick',
                        userId: 'k12345'
                    }
                }
            };

            mockDispatcher.dispatchOperation.mockResolvedValue({
                displayName: 'ChatUser'
            } as GetUserDisplayNameResponse);

            const result = await variable.evaluator(trigger);

            expect(result).toBe('ChatUser');
            expect(mockDispatcher.dispatchOperation).toHaveBeenCalledWith(
                'get-user-display-name',
                'kick',
                { username: 'chatuser@kick' }
            );
        });

        it('should extract username from eventData', async () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'toplevel',
                    platform: 'youtube',
                    eventData: {
                        username: 'eventuser@youtube'
                    }
                }
            };

            mockDispatcher.dispatchOperation.mockResolvedValue({
                displayName: 'EventUser'
            } as GetUserDisplayNameResponse);

            const result = await variable.evaluator(trigger);

            expect(result).toBe('EventUser');
            expect(mockDispatcher.dispatchOperation).toHaveBeenCalledWith(
                'get-user-display-name',
                'youtube',
                { username: 'eventuser@youtube' }
            );
        });

        it('should return "unknown" when no username is found', async () => {
            const trigger: Trigger = {
                type: 'manual',
                metadata: {
                    username: ''
                }
            };

            const result = await variable.evaluator(trigger);

            expect(result).toBe('unknown');
            expect(mockDispatcher.dispatchOperation).not.toHaveBeenCalled();
        });

        it('should use fallback display name when platform is unknown', async () => {
            const trigger: Trigger = {
                type: 'manual',
                metadata: {
                    username: undefined,
                    eventSource: undefined,
                    eventData: undefined,
                    chatMessage: {
                        username: 'someuser',
                        displayName: 'SomeFallbackUser'
                    }
                }
            } as unknown as Trigger;

            // Since chatMessage.username exists, it will be detected as twitch
            // and dispatcher will be called, but mock it to return nothing
            mockDispatcher.dispatchOperation.mockRejectedValue(new Error('Dispatcher error'));

            const result = await variable.evaluator(trigger);

            // Should fall back to chatMessage.displayName when dispatcher fails or returns nothing
            expect(result).toBe('SomeFallbackUser');
            expect(mockDispatcher.dispatchOperation).toHaveBeenCalled();
        });

        it('should use fallback from eventData.displayName when platform call fails', async () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser',
                    platform: 'kick',
                    eventData: {
                        displayName: 'FallbackDisplayName'
                    }
                }
            };

            mockDispatcher.dispatchOperation.mockRejectedValue(new Error('Network error'));

            const result = await variable.evaluator(trigger);

            expect(result).toBe('FallbackDisplayName');
        });

        it('should use fallback from chatMessage.displayName when dispatcher returns null', async () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser',
                    platform: 'youtube',
                    chatMessage: {
                        username: 'testuser',
                        displayName: 'ChatFallback'
                    }
                }
            };

            mockDispatcher.dispatchOperation.mockResolvedValue({
                displayName: null
            } as GetUserDisplayNameResponse);

            const result = await variable.evaluator(trigger);

            expect(result).toBe('ChatFallback');
        });

        it('should return username when no display name is available', async () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'plainuser',
                    platform: 'twitch'
                }
            };

            mockDispatcher.dispatchOperation.mockResolvedValue({
                displayName: null
            } as GetUserDisplayNameResponse);

            const result = await variable.evaluator(trigger);

            expect(result).toBe('plainuser');
        });

        it('should prioritize chatMessage username over eventData username', async () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'toplevel',
                    platform: 'kick',
                    chatMessage: {
                        username: 'chatuser@kick'
                    },
                    eventData: {
                        username: 'eventuser@kick'
                    }
                }
            };

            mockDispatcher.dispatchOperation.mockResolvedValue({
                displayName: 'ChatUserDisplay'
            } as GetUserDisplayNameResponse);

            const result = await variable.evaluator(trigger);

            expect(result).toBe('ChatUserDisplay');
            expect(mockDispatcher.dispatchOperation).toHaveBeenCalledWith(
                'get-user-display-name',
                'kick',
                { username: 'chatuser@kick' }
            );
        });

        it('should prioritize chatMessage displayName over eventData displayName', async () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser',
                    platform: 'unknown',
                    chatMessage: {
                        username: 'testuser',
                        displayName: 'ChatDisplay'
                    },
                    eventData: {
                        displayName: 'EventDisplay'
                    }
                }
            };

            const result = await variable.evaluator(trigger);

            expect(result).toBe('ChatDisplay');
        });

        it('should handle dispatcher error gracefully', async () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'erroruser',
                    platform: 'kick'
                }
            };

            mockDispatcher.dispatchOperation.mockRejectedValue(new Error('Integration not installed'));

            const result = await variable.evaluator(trigger);

            expect(result).toBe('erroruser');
            expect(mockLogger.debug).toHaveBeenCalledWith(
                expect.stringContaining('Failed to get display name')
            );
        });

        it('should detect platform from userId patterns', async () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'youtubeuser@youtube',
                    eventData: {
                        userId: 'y1234567890123456789012'
                    }
                }
            };

            mockDispatcher.dispatchOperation.mockResolvedValue({
                displayName: 'YouTubeDisplay'
            } as GetUserDisplayNameResponse);

            const result = await variable.evaluator(trigger);

            expect(result).toBe('YouTubeDisplay');
            expect(mockDispatcher.dispatchOperation).toHaveBeenCalledWith(
                'get-user-display-name',
                'youtube',
                { username: 'youtubeuser@youtube' }
            );
        });
    });
});
