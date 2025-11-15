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
            dispatch: jest.fn()
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

            mockDispatcher.dispatch.mockResolvedValue({
                displayName: 'TestUser'
            } as GetUserDisplayNameResponse);

            const result = await variable.evaluator(trigger);

            expect(result).toBe('TestUser');
            expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
                'twitch',
                'get-user-display-name',
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

            mockDispatcher.dispatch.mockResolvedValue({
                displayName: 'KickUser'
            } as GetUserDisplayNameResponse);

            const result = await variable.evaluator(trigger);

            expect(result).toBe('KickUser');
            expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
                'kick',
                'get-user-display-name',
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

            mockDispatcher.dispatch.mockResolvedValue({
                displayName: 'YouTubeUser'
            } as GetUserDisplayNameResponse);

            const result = await variable.evaluator(trigger);

            expect(result).toBe('YouTubeUser');
            expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
                'youtube',
                'get-user-display-name',
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

            mockDispatcher.dispatch.mockResolvedValue({
                displayName: 'ArgumentUser'
            } as GetUserDisplayNameResponse);

            const result = await variable.evaluator(trigger, 'argumentuser');

            expect(result).toBe('ArgumentUser');
            expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
                'twitch',
                'get-user-display-name',
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

            mockDispatcher.dispatch.mockResolvedValue({
                displayName: 'ChatUser'
            } as GetUserDisplayNameResponse);

            const result = await variable.evaluator(trigger);

            expect(result).toBe('ChatUser');
            expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
                'kick',
                'get-user-display-name',
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

            mockDispatcher.dispatch.mockResolvedValue({
                displayName: 'EventUser'
            } as GetUserDisplayNameResponse);

            const result = await variable.evaluator(trigger);

            expect(result).toBe('EventUser');
            expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
                'youtube',
                'get-user-display-name',
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
            expect(mockDispatcher.dispatch).not.toHaveBeenCalled();
        });

        it('should use fallback display name when platform is unknown', async () => {
            const trigger: Trigger = {
                type: 'manual',
                metadata: {
                    username: 'someuser',
                    chatMessage: {
                        username: 'someuser',
                        displayName: 'SomeFallbackUser'
                    }
                }
            };

            const result = await variable.evaluator(trigger);

            expect(result).toBe('SomeFallbackUser');
            expect(mockDispatcher.dispatch).not.toHaveBeenCalled();
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

            mockDispatcher.dispatch.mockRejectedValue(new Error('Network error'));

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

            mockDispatcher.dispatch.mockResolvedValue({
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

            mockDispatcher.dispatch.mockResolvedValue({
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

            mockDispatcher.dispatch.mockResolvedValue({
                displayName: 'ChatUserDisplay'
            } as GetUserDisplayNameResponse);

            const result = await variable.evaluator(trigger);

            expect(result).toBe('ChatUserDisplay');
            expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
                'kick',
                'get-user-display-name',
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

            mockDispatcher.dispatch.mockRejectedValue(new Error('Integration not installed'));

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

            mockDispatcher.dispatch.mockResolvedValue({
                displayName: 'YouTubeDisplay'
            } as GetUserDisplayNameResponse);

            const result = await variable.evaluator(trigger);

            expect(result).toBe('YouTubeDisplay');
            expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
                'youtube',
                'get-user-display-name',
                { username: 'youtubeuser@youtube' }
            );
        });
    });
});
