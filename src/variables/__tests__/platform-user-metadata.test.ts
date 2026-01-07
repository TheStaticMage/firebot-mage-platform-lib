import type { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import { createPlatformUserMetadataVariable } from '../platform-user-metadata';
import { firebot } from '../../main';
import type { LogWrapper } from '../../main';

jest.mock('../../main', () => ({
    firebot: {
        modules: {
            viewerMetadataManager: {
                getViewerMetadata: jest.fn()
            }
        }
    }
}));

describe('platformUserMetadata', () => {
    const logger = {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn()
    } as unknown as LogWrapper;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns default value when username is missing', async () => {
        const userDatabase = {
            detectPlatform: jest.fn(),
            normalizeUsername: jest.fn(),
            getUserByUsername: jest.fn()
        };

        const variable = createPlatformUserMetadataVariable(userDatabase as any, logger);
        const result = await variable.evaluator({} as Trigger, '', 'key', 'default');

        expect(result).toBe('default');
    });

    it('returns default value when key is missing', async () => {
        const userDatabase = {
            detectPlatform: jest.fn(),
            normalizeUsername: jest.fn(),
            getUserByUsername: jest.fn()
        };

        const variable = createPlatformUserMetadataVariable(userDatabase as any, logger);
        const result = await variable.evaluator({} as Trigger, 'username', '', 'default');

        expect(result).toBe('default');
    });

    it('gets Twitch metadata via viewerMetadataManager', async () => {
        const userDatabase = {
            detectPlatform: jest.fn().mockReturnValue('twitch'),
            normalizeUsername: jest.fn(),
            getUserByUsername: jest.fn()
        };

        const viewerMetadataManager = (firebot.modules as any).viewerMetadataManager;
        viewerMetadataManager.getViewerMetadata.mockResolvedValue('metadata-value');

        const variable = createPlatformUserMetadataVariable(userDatabase as any, logger);
        const result = await variable.evaluator(
            { metadata: { username: '@TestUser@Twitch' } } as Trigger,
            '@TestUser@Twitch',
            'key'
        );

        expect(viewerMetadataManager.getViewerMetadata).toHaveBeenCalledWith('testuser', 'key', null);
        expect(result).toBe('metadata-value');
    });

    it('returns default value when Twitch metadata is null', async () => {
        const userDatabase = {
            detectPlatform: jest.fn().mockReturnValue('twitch'),
            normalizeUsername: jest.fn(),
            getUserByUsername: jest.fn()
        };

        const viewerMetadataManager = (firebot.modules as any).viewerMetadataManager;
        viewerMetadataManager.getViewerMetadata.mockResolvedValue(null);

        const variable = createPlatformUserMetadataVariable(userDatabase as any, logger);
        const result = await variable.evaluator(
            { metadata: { username: '@TestUser@Twitch' } } as Trigger,
            '@TestUser@Twitch',
            'key',
            'default'
        );

        expect(result).toBe('default');
    });

    it('gets Kick metadata from platform user database', async () => {
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
                metadata: { key: 'kick-metadata-value' },
                chatMessages: 0,
                minutesInChannel: 0,
                twitchRoles: []
            })
        };

        const variable = createPlatformUserMetadataVariable(userDatabase as any, logger);
        const result = await variable.evaluator(
            { metadata: { username: 'testuser@kick' } } as Trigger,
            'testuser@kick',
            'key'
        );

        expect(userDatabase.getUserByUsername).toHaveBeenCalledWith('testuser', 'kick');
        expect(result).toBe('kick-metadata-value');
    });

    it('gets YouTube metadata from platform user database', async () => {
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
                metadata: { key: 'youtube-metadata-value' },
                chatMessages: 0,
                minutesInChannel: 0,
                twitchRoles: []
            })
        };

        const variable = createPlatformUserMetadataVariable(userDatabase as any, logger);
        const result = await variable.evaluator(
            { metadata: { username: 'testuser@youtube' } } as Trigger,
            'testuser@youtube',
            'key'
        );

        expect(userDatabase.getUserByUsername).toHaveBeenCalledWith('testuser', 'youtube');
        expect(result).toBe('youtube-metadata-value');
    });

    it('returns default value when Kick user not found', async () => {
        const userDatabase = {
            detectPlatform: jest.fn().mockReturnValue('kick'),
            normalizeUsername: jest.fn().mockReturnValue('testuser'),
            getUserByUsername: jest.fn().mockResolvedValue(null)
        };

        const variable = createPlatformUserMetadataVariable(userDatabase as any, logger);
        const result = await variable.evaluator(
            { metadata: { username: 'testuser@kick' } } as Trigger,
            'testuser@kick',
            'key',
            'default'
        );

        expect(result).toBe('default');
    });

    it('handles property path for Kick metadata', async () => {
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
                metadata: { key: { nested: { value: 'deep-value' } } },
                chatMessages: 0,
                minutesInChannel: 0,
                twitchRoles: []
            })
        };

        const variable = createPlatformUserMetadataVariable(userDatabase as any, logger);
        const result = await variable.evaluator(
            { metadata: { username: 'testuser@kick' } } as Trigger,
            'testuser@kick',
            'key',
            null,
            'nested.value'
        );

        expect(result).toBe('deep-value');
    });

    it('uses explicit platform parameter', async () => {
        const userDatabase = {
            detectPlatform: jest.fn(),
            normalizeUsername: jest.fn(),
            getUserByUsername: jest.fn()
        };

        const viewerMetadataManager = (firebot.modules as any).viewerMetadataManager;
        viewerMetadataManager.getViewerMetadata.mockResolvedValue('twitch-value');

        const variable = createPlatformUserMetadataVariable(userDatabase as any, logger);
        const result = await variable.evaluator(
            {} as Trigger,
            '@TestUser@Twitch',
            'key',
            null,
            null,
            'twitch'
        );

        expect(viewerMetadataManager.getViewerMetadata).toHaveBeenCalledWith('testuser', 'key', null);
        expect(result).toBe('twitch-value');
    });

    it('handles errors gracefully', async () => {
        const userDatabase = {
            detectPlatform: jest.fn().mockReturnValue('twitch'),
            normalizeUsername: jest.fn(),
            getUserByUsername: jest.fn()
        };

        const viewerMetadataManager = (firebot.modules as any).viewerMetadataManager;
        viewerMetadataManager.getViewerMetadata.mockRejectedValue(new Error('API error'));

        const variable = createPlatformUserMetadataVariable(userDatabase as any, logger);
        const result = await variable.evaluator(
            { metadata: { username: '@TestUser@Twitch' } } as Trigger,
            '@TestUser@Twitch',
            'key',
            'default'
        );

        expect(result).toBe('default');
    });
});
