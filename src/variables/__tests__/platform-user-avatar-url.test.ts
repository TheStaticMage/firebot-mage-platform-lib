import type { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import { createPlatformUserAvatarUrlVariable } from '../platform-user-avatar-url';
import { firebot } from '../../main';
import type { LogWrapper } from '../../main';

jest.mock('../../main', () => ({
    firebot: {
        modules: {
            twitchApi: {
                users: {
                    getUserByName: jest.fn()
                }
            }
        }
    }
}));

describe('platformUserAvatarUrl', () => {
    const logger = {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn()
    } as unknown as LogWrapper;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns "No username available" when username is missing', async () => {
        const userDatabase = {
            detectPlatform: jest.fn(),
            normalizeUsername: jest.fn(),
            getUserByUsername: jest.fn()
        };

        const variable = createPlatformUserAvatarUrlVariable(userDatabase as any, logger);
        const result = await variable.evaluator({} as Trigger);

        expect(result).toBe('[No username available]');
    });

    it('gets Twitch avatar URL', async () => {
        const userDatabase = {
            detectPlatform: jest.fn().mockReturnValue('twitch'),
            normalizeUsername: jest.fn(),
            getUserByUsername: jest.fn()
        };

        const twitchApi = (firebot.modules as any).twitchApi;
        twitchApi.users.getUserByName.mockResolvedValue({
            profilePictureUrl: 'https://example.com/avatar.png'
        });

        const variable = createPlatformUserAvatarUrlVariable(userDatabase as any, logger);
        const result = await variable.evaluator(
            { metadata: { username: '@TestUser@Twitch' } } as Trigger,
            '@TestUser@Twitch'
        );

        expect(twitchApi.users.getUserByName).toHaveBeenCalledWith('testuser');
        expect(result).toBe('https://example.com/avatar.png');
    });

    it('returns "No avatar found" when Twitch avatar URL is missing', async () => {
        const userDatabase = {
            detectPlatform: jest.fn().mockReturnValue('twitch'),
            normalizeUsername: jest.fn(),
            getUserByUsername: jest.fn()
        };

        const twitchApi = (firebot.modules as any).twitchApi;
        twitchApi.users.getUserByName.mockResolvedValue({
            profilePictureUrl: undefined
        });

        const variable = createPlatformUserAvatarUrlVariable(userDatabase as any, logger);
        const result = await variable.evaluator(
            { metadata: { username: '@TestUser@Twitch' } } as Trigger,
            '@TestUser@Twitch'
        );

        expect(result).toBe('[No avatar found]');
    });

    it('returns Kick avatar URL from platform user database', async () => {
        const userDatabase = {
            detectPlatform: jest.fn().mockReturnValue('kick'),
            normalizeUsername: jest.fn().mockReturnValue('testuser'),
            getUserByUsername: jest.fn().mockResolvedValue({
                _id: 'user-id',
                username: 'testuser',
                displayName: 'TestUser',
                profilePicUrl: 'https://example.com/kick-avatar.png',
                lastSeen: 0,
                currency: {},
                metadata: {},
                chatMessages: 0,
                minutesInChannel: 0,
                twitchRoles: []
            })
        };

        const variable = createPlatformUserAvatarUrlVariable(userDatabase as any, logger);
        const result = await variable.evaluator(
            { metadata: { username: 'testuser@kick' } } as Trigger,
            'testuser@kick'
        );

        expect(result).toBe('https://example.com/kick-avatar.png');
    });

    it('returns YouTube avatar URL from platform user database', async () => {
        const userDatabase = {
            detectPlatform: jest.fn().mockReturnValue('youtube'),
            normalizeUsername: jest.fn().mockReturnValue('testuser'),
            getUserByUsername: jest.fn().mockResolvedValue({
                _id: 'user-id',
                username: 'testuser',
                displayName: 'TestUser',
                profilePicUrl: 'https://example.com/youtube-avatar.png',
                lastSeen: 0,
                currency: {},
                metadata: {},
                chatMessages: 0,
                minutesInChannel: 0,
                twitchRoles: []
            })
        };

        const variable = createPlatformUserAvatarUrlVariable(userDatabase as any, logger);
        const result = await variable.evaluator(
            { metadata: { username: 'testuser@youtube' } } as Trigger,
            'testuser@youtube'
        );

        expect(result).toBe('https://example.com/youtube-avatar.png');
    });

    it('returns "No avatar found" when Kick user has no profilePicUrl', async () => {
        const userDatabase = {
            detectPlatform: jest.fn().mockReturnValue('kick'),
            normalizeUsername: jest.fn().mockReturnValue('testuser'),
            getUserByUsername: jest.fn().mockResolvedValue({
                _id: 'user-id',
                username: 'testuser',
                displayName: 'TestUser',
                profilePicUrl: undefined,
                lastSeen: 0,
                currency: {},
                metadata: {},
                chatMessages: 0,
                minutesInChannel: 0,
                twitchRoles: []
            })
        };

        const variable = createPlatformUserAvatarUrlVariable(userDatabase as any, logger);
        const result = await variable.evaluator(
            { metadata: { username: 'testuser@kick' } } as Trigger,
            'testuser@kick'
        );

        expect(result).toBe('[No avatar found]');
    });

    it('uses explicit platform parameter', async () => {
        const userDatabase = {
            detectPlatform: jest.fn(),
            normalizeUsername: jest.fn(),
            getUserByUsername: jest.fn()
        };

        const twitchApi = (firebot.modules as any).twitchApi;
        twitchApi.users.getUserByName.mockResolvedValue({
            profilePictureUrl: 'https://example.com/avatar.png'
        });

        const variable = createPlatformUserAvatarUrlVariable(userDatabase as any, logger);
        const result = await variable.evaluator(
            {} as Trigger,
            '@TestUser@Twitch',
            'twitch'
        );

        expect(twitchApi.users.getUserByName).toHaveBeenCalledWith('testuser');
        expect(result).toBe('https://example.com/avatar.png');
    });

    it('handles Twitch API errors gracefully', async () => {
        const userDatabase = {
            detectPlatform: jest.fn().mockReturnValue('twitch'),
            normalizeUsername: jest.fn(),
            getUserByUsername: jest.fn()
        };

        const twitchApi = (firebot.modules as any).twitchApi;
        twitchApi.users.getUserByName.mockRejectedValue(new Error('API error'));

        const variable = createPlatformUserAvatarUrlVariable(userDatabase as any, logger);
        const result = await variable.evaluator(
            { metadata: { username: '@TestUser@Twitch' } } as Trigger,
            '@TestUser@Twitch'
        );

        expect(result).toBe('[No avatar found]');
    });
});
