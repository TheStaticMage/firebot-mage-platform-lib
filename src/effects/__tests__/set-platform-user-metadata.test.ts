const mockViewerMetadataManager = {
    updateViewerMetadata: jest.fn()
};

const mockUserDatabase = {
    detectPlatform: jest.fn(),
    getUserByUsername: jest.fn(),
    setUserMetadata: jest.fn()
};

const mockLogger = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
};

jest.mock('../../main', () => ({
    firebot: {
        modules: {
            viewerMetadataManager: mockViewerMetadataManager
        }
    },
    logger: mockLogger,
    platformLib: {
        userDatabase: mockUserDatabase
    }
}));

import { setPlatformUserMetadataEffect } from '../set-platform-user-metadata';

describe('set-platform-user-metadata effect', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const buildEvent = (effectOverrides: Partial<any>) => ({
        effect: {
            platform: 'kick',
            username: 'testuser',
            key: 'profile',
            data: '{"tier":2}',
            propertyPath: 'details.rank',
            ...effectOverrides
        },
        trigger: undefined
    });

    it('passes JSON metadata updates with property paths for Kick', async () => {
        mockUserDatabase.getUserByUsername.mockResolvedValue({ _id: 'k123' });

        const event = buildEvent({ platform: 'kick' });
        const result = await setPlatformUserMetadataEffect.onTriggerEvent(event as any);

        expect(result).toBe(true);
        expect(mockUserDatabase.setUserMetadata).toHaveBeenCalledWith(
            'kick',
            'k123',
            'profile',
            '{"tier":2}',
            'details.rank'
        );
    });

    it('passes JSON metadata updates with property paths for Twitch', async () => {
        const event = buildEvent({ platform: 'twitch' });
        const result = await setPlatformUserMetadataEffect.onTriggerEvent(event as any);

        expect(result).toBe(true);
        expect(mockViewerMetadataManager.updateViewerMetadata).toHaveBeenCalledWith(
            'testuser',
            'profile',
            '{"tier":2}',
            'details.rank'
        );
    });

    it('returns false when username is missing', async () => {
        const event = buildEvent({ username: '' });
        const result = await setPlatformUserMetadataEffect.onTriggerEvent(event as any);

        expect(result).toBe(false);
        expect(mockLogger.error).toHaveBeenCalledWith('Set Platform User Metadata: Username and key are required');
    });

    it('returns false when key is missing', async () => {
        const event = buildEvent({ key: '' });
        const result = await setPlatformUserMetadataEffect.onTriggerEvent(event as any);

        expect(result).toBe(false);
        expect(mockLogger.error).toHaveBeenCalledWith('Set Platform User Metadata: Username and key are required');
    });

    it('returns false when platform cannot be determined', async () => {
        mockUserDatabase.detectPlatform.mockReturnValue('unknown');
        const event = buildEvent({ platform: 'auto-detect' });
        const result = await setPlatformUserMetadataEffect.onTriggerEvent(event as any);

        expect(result).toBe(false);
        expect(mockLogger.error).toHaveBeenCalledWith('Set Platform User Metadata: Cannot determine platform for user testuser');
    });

    it('returns false when user is not found', async () => {
        mockUserDatabase.getUserByUsername.mockResolvedValue(null);
        const event = buildEvent({ platform: 'kick' });
        const result = await setPlatformUserMetadataEffect.onTriggerEvent(event as any);

        expect(result).toBe(false);
        expect(mockLogger.error).toHaveBeenCalledWith('Set Platform User Metadata: User not found: testuser');
    });

    it('returns false when platform is not supported', async () => {
        mockUserDatabase.detectPlatform.mockReturnValue('unsupported');
        const event = buildEvent({ platform: 'auto-detect' });
        const result = await setPlatformUserMetadataEffect.onTriggerEvent(event as any);

        expect(result).toBe(false);
        expect(mockLogger.error).toHaveBeenCalledWith('Set Platform User Metadata: Platform unsupported not supported');
    });

    it('handles auto-detect platform successfully', async () => {
        mockUserDatabase.detectPlatform.mockReturnValue('kick');
        mockUserDatabase.getUserByUsername.mockResolvedValue({ _id: 'k123' });
        const event = buildEvent({ platform: 'auto-detect' });
        const result = await setPlatformUserMetadataEffect.onTriggerEvent(event as any);

        expect(result).toBe(true);
        expect(mockUserDatabase.detectPlatform).toHaveBeenCalled();
        expect(mockUserDatabase.setUserMetadata).toHaveBeenCalledWith(
            'kick',
            'k123',
            'profile',
            '{"tier":2}',
            'details.rank'
        );
    });
});
