import type { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import { createPlatformChatMessagesVariable } from '../platform-chat-messages';
import { firebot } from '../../main';
import type { LogWrapper } from '../../main';

jest.mock('../../main', () => ({
    firebot: {
        modules: {
            viewerDatabase: {
                getViewerByUsername: jest.fn()
            }
        }
    }
}));

describe('platformChatMessages', () => {
    const logger = {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn()
    } as unknown as LogWrapper;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns 0 when username is missing', async () => {
        const userDatabase = {
            detectPlatform: jest.fn(),
            normalizeUsername: jest.fn(),
            getUserByUsername: jest.fn()
        };

        const variable = createPlatformChatMessagesVariable(userDatabase as any, logger);
        const result = await variable.evaluator({} as Trigger);

        expect(result).toBe(0);
    });

    it('gets Twitch chat messages count', async () => {
        const userDatabase = {
            detectPlatform: jest.fn().mockReturnValue('twitch'),
            normalizeUsername: jest.fn(),
            getUserByUsername: jest.fn()
        };

        const viewerDatabase = (firebot.modules as any).viewerDatabase;
        viewerDatabase.getViewerByUsername.mockResolvedValue({
            chatMessages: 42
        });

        const variable = createPlatformChatMessagesVariable(userDatabase as any, logger);
        const result = await variable.evaluator(
            { metadata: { username: 'testuser' } } as Trigger,
            'testuser'
        );

        expect(result).toBe(42);
    });

    it('returns 0 when Twitch user not found', async () => {
        const userDatabase = {
            detectPlatform: jest.fn().mockReturnValue('twitch'),
            normalizeUsername: jest.fn(),
            getUserByUsername: jest.fn()
        };

        const viewerDatabase = (firebot.modules as any).viewerDatabase;
        viewerDatabase.getViewerByUsername.mockResolvedValue(null);

        const variable = createPlatformChatMessagesVariable(userDatabase as any, logger);
        const result = await variable.evaluator(
            { metadata: { username: 'testuser' } } as Trigger,
            'testuser'
        );

        expect(result).toBe(0);
    });

    it('gets Kick chat messages count from platform user database', async () => {
        const userDatabase = {
            detectPlatform: jest.fn().mockReturnValue('kick'),
            normalizeUsername: jest.fn().mockReturnValue('testuser'),
            getUserByUsername: jest.fn().mockResolvedValue({
                _id: 'user-id',
                username: 'testuser',
                displayName: 'TestUser',
                profilePicUrl: '',
                lastSeen: 0,
                currency: {},
                metadata: {},
                chatMessages: 15,
                minutesInChannel: 0,
                twitchRoles: []
            })
        };

        const variable = createPlatformChatMessagesVariable(userDatabase as any, logger);
        const result = await variable.evaluator(
            { metadata: { username: 'testuser@kick' } } as Trigger,
            'testuser@kick'
        );

        expect(result).toBe(15);
    });

    it('gets YouTube chat messages count from platform user database', async () => {
        const userDatabase = {
            detectPlatform: jest.fn().mockReturnValue('youtube'),
            normalizeUsername: jest.fn().mockReturnValue('testuser'),
            getUserByUsername: jest.fn().mockResolvedValue({
                _id: 'user-id',
                username: 'testuser',
                displayName: 'TestUser',
                profilePicUrl: '',
                lastSeen: 0,
                currency: {},
                metadata: {},
                chatMessages: 7,
                minutesInChannel: 0,
                twitchRoles: []
            })
        };

        const variable = createPlatformChatMessagesVariable(userDatabase as any, logger);
        const result = await variable.evaluator(
            { metadata: { username: 'testuser@youtube' } } as Trigger,
            'testuser@youtube'
        );

        expect(result).toBe(7);
    });

    it('returns 0 when Kick user not found', async () => {
        const userDatabase = {
            detectPlatform: jest.fn().mockReturnValue('kick'),
            normalizeUsername: jest.fn().mockReturnValue('testuser'),
            getUserByUsername: jest.fn().mockResolvedValue(null)
        };

        const variable = createPlatformChatMessagesVariable(userDatabase as any, logger);
        const result = await variable.evaluator(
            { metadata: { username: 'testuser@kick' } } as Trigger,
            'testuser@kick'
        );

        expect(result).toBe(0);
    });

    it('uses explicit platform parameter', async () => {
        const userDatabase = {
            detectPlatform: jest.fn(),
            normalizeUsername: jest.fn(),
            getUserByUsername: jest.fn()
        };

        const viewerDatabase = (firebot.modules as any).viewerDatabase;
        viewerDatabase.getViewerByUsername.mockResolvedValue({
            chatMessages: 99
        });

        const variable = createPlatformChatMessagesVariable(userDatabase as any, logger);
        const result = await variable.evaluator(
            {} as Trigger,
            'testuser',
            'twitch'
        );

        expect(result).toBe(99);
    });

    it('handles errors gracefully', async () => {
        const userDatabase = {
            detectPlatform: jest.fn().mockReturnValue('twitch'),
            normalizeUsername: jest.fn(),
            getUserByUsername: jest.fn()
        };

        const viewerDatabase = (firebot.modules as any).viewerDatabase;
        viewerDatabase.getViewerByUsername.mockRejectedValue(new Error('DB error'));

        const variable = createPlatformChatMessagesVariable(userDatabase as any, logger);
        const result = await variable.evaluator(
            { metadata: { username: 'testuser' } } as Trigger,
            'testuser'
        );

        expect(result).toBe(0);
    });
});
