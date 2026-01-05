/* eslint-disable @typescript-eslint/unbound-method */
import { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import { PlatformUserDatabase } from '../../internal/platform-user-database';
import { LogWrapper } from '../../main';
import { createPlatformAwareUserDisplayNameVariable } from '../platform-aware-user-display-name';

// Mock firebot module
jest.mock('../../main', () => ({
    firebot: {
        modules: {
            userDb: {
                getTwitchUserByUsername: jest.fn()
            }
        }
    },
    LogWrapper: jest.fn()
}));

describe('platformAwareUserDisplayName variable', () => {
    let mockUserDatabase: jest.Mocked<PlatformUserDatabase>;
    let mockLogger: Partial<LogWrapper>;
    let variable: ReturnType<typeof createPlatformAwareUserDisplayNameVariable>;
    let mockFirebot: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockUserDatabase = {
            getUserByUsername: jest.fn(),
            normalizeUsername: jest.fn(u => u.toLowerCase().replace(/^@|@(kick|youtube)$/gi, ''))
        } as unknown as jest.Mocked<PlatformUserDatabase>;

        mockLogger = {
            debug: jest.fn(),
            error: jest.fn(),
            info: jest.fn(),
            warn: jest.fn()
        };

        mockFirebot = require('../../main').firebot;

        variable = createPlatformAwareUserDisplayNameVariable(mockUserDatabase, mockLogger as LogWrapper);
    });

    describe('trigger display name priority', () => {
        it('should return trigger display name when no username provided', async () => {
            const trigger = {
                type: 'event',
                metadata: {
                    username: '',
                    chatMessage: {
                        displayName: 'TriggerDisplay'
                    }
                }
            } as unknown as Trigger;

            const result = await variable.evaluator(trigger);

            expect(result).toBe('TriggerDisplay');
            expect(mockUserDatabase.getUserByUsername).not.toHaveBeenCalled();
            expect(mockFirebot.modules.userDb.getTwitchUserByUsername).not.toHaveBeenCalled();
        });

        it('should return empty string when no display name and no username', async () => {
            const trigger = {
                type: 'manual',
                metadata: {
                    username: ''
                }
            } as unknown as Trigger;

            const result = await variable.evaluator(trigger);

            expect(result).toBe('');
        });

        it('should prioritize chatMessage display name over eventData', async () => {
            const trigger = {
                type: 'event',
                metadata: {
                    username: '',
                    chatMessage: {
                        displayName: 'ChatDisplay'
                    },
                    eventData: {
                        displayName: 'EventDisplay'
                    }
                }
            } as unknown as Trigger;

            const result = await variable.evaluator(trigger);

            expect(result).toBe('ChatDisplay');
        });

        it('should ignore trigger display name when username argument provided', async () => {
            const trigger = {
                type: 'event',
                metadata: {
                    username: '',
                    chatMessage: {
                        displayName: 'TriggerDisplay'
                    },
                    platform: 'twitch'
                }
            } as unknown as Trigger;

            mockFirebot.modules.userDb.getTwitchUserByUsername.mockResolvedValue({
                displayName: 'DatabaseDisplay'
            });

            const result = await variable.evaluator(trigger, 'testuser');

            expect(result).toBe('DatabaseDisplay');
        });
    });

    describe('Twitch platform', () => {
        it('should get display name from Firebot userDb', async () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser',
                    platform: 'twitch'
                }
            };

            mockFirebot.modules.userDb.getTwitchUserByUsername.mockResolvedValue({
                displayName: 'TestUser'
            });

            const result = await variable.evaluator(trigger);

            expect(result).toBe('TestUser');
            expect(mockFirebot.modules.userDb.getTwitchUserByUsername).toHaveBeenCalledWith('testuser');
        });

        it('should fallback to username when Twitch lookup returns no displayName', async () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser',
                    platform: 'twitch'
                }
            };

            mockFirebot.modules.userDb.getTwitchUserByUsername.mockResolvedValue(null);

            const result = await variable.evaluator(trigger);

            expect(result).toBe('testuser');
        });

        it('should fallback to username when Twitch lookup fails', async () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser',
                    platform: 'twitch'
                }
            };

            mockFirebot.modules.userDb.getTwitchUserByUsername.mockRejectedValue(new Error('DB error'));

            const result = await variable.evaluator(trigger);

            expect(result).toBe('testuser');
        });
    });

    describe('Kick platform', () => {
        it('should get display name from user database', async () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'kickuser@kick',
                    eventData: {
                        platform: 'kick'
                    }
                }
            };

            mockUserDatabase.getUserByUsername.mockResolvedValue({
                _id: 'k12345',
                username: 'kickuser',
                displayName: 'KickUser',
                profilePicUrl: '',
                lastSeen: Date.now(),
                currency: {},
                metadata: {},
                chatMessages: 0,
                minutesInChannel: 0
            });

            const result = await variable.evaluator(trigger);

            expect(result).toBe('KickUser');
            expect(mockUserDatabase.getUserByUsername).toHaveBeenCalled();
        });

        it('should normalize username before lookup', async () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: '@KickUser@kick',
                    eventData: {
                        platform: 'kick'
                    }
                }
            };

            mockUserDatabase.getUserByUsername.mockResolvedValue(null);

            await variable.evaluator(trigger);

            expect(mockUserDatabase.normalizeUsername).toHaveBeenCalledWith('@KickUser@kick');
        });

        it('should strip decorations when user not found', async () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: '@TestUser@kick',
                    eventData: {
                        platform: 'kick'
                    }
                }
            };

            mockUserDatabase.getUserByUsername.mockResolvedValue(null);

            const result = await variable.evaluator(trigger);

            expect(result).toBe('TestUser');
        });

        it('should preserve capitalization in stripped username', async () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: '@MyKickUser@kick',
                    eventData: {
                        platform: 'kick'
                    }
                }
            };

            mockUserDatabase.getUserByUsername.mockResolvedValue(null);

            const result = await variable.evaluator(trigger);

            expect(result).toBe('MyKickUser');
        });
    });

    describe('YouTube platform', () => {
        it('should get display name from user database', async () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'youtubeuser@youtube',
                    eventData: {
                        platform: 'youtube'
                    }
                }
            };

            mockUserDatabase.getUserByUsername.mockResolvedValue({
                _id: 'yUC123abc',
                username: 'youtubeuser',
                displayName: 'YouTubeUser',
                profilePicUrl: '',
                lastSeen: Date.now(),
                currency: {},
                metadata: {},
                chatMessages: 0,
                minutesInChannel: 0
            });

            const result = await variable.evaluator(trigger);

            expect(result).toBe('YouTubeUser');
        });

        it('should strip decorations for YouTube users', async () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: '@YouTubeUser@youtube',
                    eventData: {
                        platform: 'youtube'
                    }
                }
            };

            mockUserDatabase.getUserByUsername.mockResolvedValue(null);

            const result = await variable.evaluator(trigger);

            expect(result).toBe('YouTubeUser');
        });
    });

    describe('unknown platform', () => {
        it('should return stripped username for unknown platform', async () => {
            const trigger: Trigger = {
                type: 'manual',
                metadata: {
                    username: '@someuser@kick'
                }
            };

            const result = await variable.evaluator(trigger);

            expect(result).toBe('someuser');
        });

        it('should return username without decoration for unknown platform', async () => {
            const trigger: Trigger = {
                type: 'manual',
                metadata: {
                    username: '@someuser'
                }
            };

            const result = await variable.evaluator(trigger);

            expect(result).toBe('someuser');
        });
    });

    describe('username argument handling', () => {
        it('should use provided username argument', async () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'triggeruser',
                    platform: 'twitch'
                }
            };

            mockFirebot.modules.userDb.getTwitchUserByUsername.mockResolvedValue({
                displayName: 'ArgumentDisplay'
            });

            const result = await variable.evaluator(trigger, 'arguser');

            expect(result).toBe('ArgumentDisplay');
            expect(mockFirebot.modules.userDb.getTwitchUserByUsername).toHaveBeenCalledWith('arguser');
        });

        it('should use trigger username if argument username is empty but use display name from trigger first', async () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'triggeruser',
                    platform: 'twitch'
                }
            };

            mockFirebot.modules.userDb.getTwitchUserByUsername.mockResolvedValue(null);

            const result = await variable.evaluator(trigger, '');

            // Empty string is falsy, so it falls back to trigger username
            expect(result).toBe('triggeruser');
        });
    });

    describe('username extraction priority', () => {
        it('should prioritize chatMessage username', async () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'toplevel',
                    chatMessage: {
                        username: 'chatuser'
                    },
                    eventData: {
                        username: 'eventuser'
                    },
                    platform: 'twitch'
                }
            };

            mockFirebot.modules.userDb.getTwitchUserByUsername.mockResolvedValue({
                displayName: 'ChatDisplay'
            });

            await variable.evaluator(trigger);

            expect(mockFirebot.modules.userDb.getTwitchUserByUsername).toHaveBeenCalledWith('chatuser');
        });

        it('should prioritize eventData username over top-level', async () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'toplevel',
                    eventData: {
                        username: 'eventuser'
                    },
                    platform: 'twitch'
                }
            };

            mockFirebot.modules.userDb.getTwitchUserByUsername.mockResolvedValue({
                displayName: 'EventDisplay'
            });

            await variable.evaluator(trigger);

            expect(mockFirebot.modules.userDb.getTwitchUserByUsername).toHaveBeenCalledWith('eventuser');
        });
    });

    describe('error handling', () => {
        it('should handle database errors gracefully', async () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser@kick',
                    eventData: {
                        platform: 'kick'
                    }
                }
            };

            mockUserDatabase.getUserByUsername.mockRejectedValue(new Error('DB error'));

            const result = await variable.evaluator(trigger);

            expect(result).toBe('testuser');
            expect(mockLogger.debug).toHaveBeenCalledWith(
                expect.stringContaining('Failed to get display name')
            );
        });

        it('should handle Twitch module errors gracefully', async () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser',
                    platform: 'twitch'
                }
            };

            mockFirebot.modules.userDb.getTwitchUserByUsername.mockRejectedValue(
                new Error('Module error')
            );

            const result = await variable.evaluator(trigger);

            expect(result).toBe('testuser');
        });
    });
});
