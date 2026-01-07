import type { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import { createPlatformLastSeenVariable } from '../platform-last-seen';
import { firebot } from '../../main';

jest.mock('../../main', () => ({
    firebot: {
        modules: {
            viewerDatabase: {
                getViewerByUsername: jest.fn()
            }
        }
    },
    logger: {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn()
    }
}));

describe('platformLastSeen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns "Unknown User" when username is missing', async () => {
        const userDatabase = {
            detectPlatform: jest.fn(),
            normalizeUsername: jest.fn(),
            getUserByUsername: jest.fn()
        };

        const variable = createPlatformLastSeenVariable(userDatabase as any);
        const result = await variable.evaluator({} as Trigger);

        expect(result).toBe('Unknown User');
    });

    it('gets Twitch last seen date', async () => {
        const userDatabase = {
            detectPlatform: jest.fn().mockReturnValue('twitch'),
            normalizeUsername: jest.fn(),
            getUserByUsername: jest.fn()
        };

        const viewerDatabase = (firebot.modules as any).viewerDatabase;
        viewerDatabase.getViewerByUsername.mockResolvedValue({
            lastSeen: 1609459200000 // 2021-01-01
        });

        const variable = createPlatformLastSeenVariable(userDatabase as any);
        const result = await variable.evaluator(
            { metadata: { username: '@TestUser@Twitch' } } as Trigger,
            '@TestUser@Twitch'
        );

        expect(viewerDatabase.getViewerByUsername).toHaveBeenCalledWith('testuser');
        expect(result).toBe('2021-01-01');
    });

    it('returns "Unknown User" when Twitch user not found', async () => {
        const userDatabase = {
            detectPlatform: jest.fn().mockReturnValue('twitch'),
            normalizeUsername: jest.fn(),
            getUserByUsername: jest.fn()
        };

        const viewerDatabase = (firebot.modules as any).viewerDatabase;
        viewerDatabase.getViewerByUsername.mockResolvedValue(null);

        const variable = createPlatformLastSeenVariable(userDatabase as any);
        const result = await variable.evaluator(
            { metadata: { username: '@TestUser@Twitch' } } as Trigger,
            '@TestUser@Twitch'
        );

        expect(viewerDatabase.getViewerByUsername).toHaveBeenCalledWith('testuser');
        expect(result).toBe('Unknown User');
    });

    it('gets Kick last seen date from platform user database', async () => {
        const userDatabase = {
            detectPlatform: jest.fn().mockReturnValue('kick'),
            normalizeUsername: jest.fn().mockReturnValue('testuser'),
            getUserByUsername: jest.fn().mockResolvedValue({
                _id: 'user-id',
                username: 'testuser',
                displayName: 'TestUser',
                profilePicUrl: '',
                lastSeen: 1609459200000,
                currency: {},
                metadata: {},
                chatMessages: 0,
                minutesInChannel: 0,
                twitchRoles: []
            })
        };

        const variable = createPlatformLastSeenVariable(userDatabase as any);
        const result = await variable.evaluator(
            { metadata: { username: 'testuser@kick' } } as Trigger,
            'testuser@kick'
        );

        expect(result).toBe('2021-01-01');
    });

    it('gets YouTube last seen date from platform user database', async () => {
        const userDatabase = {
            detectPlatform: jest.fn().mockReturnValue('youtube'),
            normalizeUsername: jest.fn().mockReturnValue('testuser'),
            getUserByUsername: jest.fn().mockResolvedValue({
                _id: 'user-id',
                username: 'testuser',
                displayName: 'TestUser',
                profilePicUrl: '',
                lastSeen: 1609459200000,
                currency: {},
                metadata: {},
                chatMessages: 0,
                minutesInChannel: 0,
                twitchRoles: []
            })
        };

        const variable = createPlatformLastSeenVariable(userDatabase as any);
        const result = await variable.evaluator(
            { metadata: { username: 'testuser@youtube' } } as Trigger,
            'testuser@youtube'
        );

        expect(result).toBe('2021-01-01');
    });

    it('returns "Unknown User" when Kick user not found', async () => {
        const userDatabase = {
            detectPlatform: jest.fn().mockReturnValue('kick'),
            normalizeUsername: jest.fn().mockReturnValue('testuser'),
            getUserByUsername: jest.fn().mockResolvedValue(null)
        };

        const variable = createPlatformLastSeenVariable(userDatabase as any);
        const result = await variable.evaluator(
            { metadata: { username: 'testuser@kick' } } as Trigger,
            'testuser@kick'
        );

        expect(result).toBe('Unknown User');
    });

    it('uses explicit platform parameter', async () => {
        const userDatabase = {
            detectPlatform: jest.fn(),
            normalizeUsername: jest.fn(),
            getUserByUsername: jest.fn()
        };

        const viewerDatabase = (firebot.modules as any).viewerDatabase;
        viewerDatabase.getViewerByUsername.mockResolvedValue({
            lastSeen: 1609459200000
        });

        const variable = createPlatformLastSeenVariable(userDatabase as any);
        const result = await variable.evaluator(
            {} as Trigger,
            '@TestUser@Twitch',
            'twitch'
        );

        expect(viewerDatabase.getViewerByUsername).toHaveBeenCalledWith('testuser');
        expect(result).toBe('2021-01-01');
    });

    it('handles errors gracefully', async () => {
        const userDatabase = {
            detectPlatform: jest.fn().mockReturnValue('twitch'),
            normalizeUsername: jest.fn(),
            getUserByUsername: jest.fn()
        };

        const viewerDatabase = (firebot.modules as any).viewerDatabase;
        viewerDatabase.getViewerByUsername.mockRejectedValue(new Error('DB error'));

        const variable = createPlatformLastSeenVariable(userDatabase as any);
        const result = await variable.evaluator(
            { metadata: { username: '@TestUser@Twitch' } } as Trigger,
            '@TestUser@Twitch'
        );

        expect(viewerDatabase.getViewerByUsername).toHaveBeenCalledWith('testuser');
        expect(result).toBe('Unknown User');
    });
});
