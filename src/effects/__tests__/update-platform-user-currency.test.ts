import type { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';

const mockCurrencyManagerNew = {
    adjustCurrencyForViewer: jest.fn(),
    adjustCurrencyForAllViewers: jest.fn()
};

const mockUserDatabase = {
    detectPlatform: jest.fn(),
    getUserByUsername: jest.fn(),
    getOrCreateUser: jest.fn(),
    getUserCurrency: jest.fn(),
    setUserCurrency: jest.fn(),
    clampCurrency: jest.fn(),
    adjustCurrencyForAllUsers: jest.fn()
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
            currencyManagerNew: mockCurrencyManagerNew
        }
    },
    logger: mockLogger,
    platformLib: {
        userDatabase: mockUserDatabase
    }
}));

import { updatePlatformUserCurrencyEffect } from '../update-platform-user-currency';

describe('update-platform-user-currency effect', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const buildEvent = (effectOverrides: Partial<any>, trigger?: Trigger) => ({
        effect: {
            platform: 'twitch',
            action: 'Add',
            target: 'individual',
            username: 'testuser',
            currency: 'points',
            amount: 5,
            ...effectOverrides
        },
        trigger
    });

    it('updates Twitch user currency for individual target', async () => {
        const event = buildEvent({ platform: 'twitch', action: 'Add', amount: 10 });

        const result = await updatePlatformUserCurrencyEffect.onTriggerEvent(event as any);

        expect(result).toBe(true);
        expect(mockCurrencyManagerNew.adjustCurrencyForViewer).toHaveBeenCalledWith(
            'testuser',
            'points',
            10,
            'adjust'
        );
    });

    it('updates Twitch user currency for all users', async () => {
        const event = buildEvent({ platform: 'twitch', target: 'allViewers', action: 'Set', amount: 20 });

        const result = await updatePlatformUserCurrencyEffect.onTriggerEvent(event as any);

        expect(result).toBe(true);
        expect(mockCurrencyManagerNew.adjustCurrencyForAllViewers).toHaveBeenCalledWith(
            'points',
            20,
            true,
            'set'
        );
    });

    it('updates Kick user currency for existing user', async () => {
        mockUserDatabase.getUserByUsername.mockResolvedValue({ _id: 'k123' });
        mockUserDatabase.getUserCurrency.mockResolvedValue(5);
        mockUserDatabase.clampCurrency.mockReturnValue(12);

        const event = buildEvent({ platform: 'kick', action: 'Add', amount: 7 });
        const result = await updatePlatformUserCurrencyEffect.onTriggerEvent(event as any);

        expect(result).toBe(true);
        expect(mockUserDatabase.setUserCurrency).toHaveBeenCalledWith('kick', 'k123', 'points', 12);
    });

    it('updates Kick user currency for all users', async () => {
        const event = buildEvent({ platform: 'kick', target: 'allViewers', action: 'Remove', amount: 3 });

        const result = await updatePlatformUserCurrencyEffect.onTriggerEvent(event as any);

        expect(result).toBe(true);
        expect(mockUserDatabase.adjustCurrencyForAllUsers).toHaveBeenCalledWith(
            'kick',
            'points',
            -3,
            'adjust'
        );
    });

    it('auto-detects platform from username suffix', async () => {
        mockUserDatabase.detectPlatform.mockReturnValue('kick');
        mockUserDatabase.getUserByUsername.mockResolvedValue({ _id: 'k123' });
        mockUserDatabase.getUserCurrency.mockResolvedValue(0);
        mockUserDatabase.clampCurrency.mockReturnValue(5);

        const event = buildEvent({ platform: 'auto-detect', username: 'user@kick', amount: 5 });
        const result = await updatePlatformUserCurrencyEffect.onTriggerEvent(event as any);

        expect(result).toBe(true);
        expect(mockUserDatabase.detectPlatform).toHaveBeenCalledWith(undefined, 'user@kick', undefined);
    });

    it('fails when platform cannot be determined', async () => {
        mockUserDatabase.detectPlatform.mockReturnValue('unknown');

        const event = buildEvent({ platform: 'auto-detect', username: 'user' });
        const result = await updatePlatformUserCurrencyEffect.onTriggerEvent(event as any);

        expect(result).toBe(false);
    });

    it('auto-creates user when trigger userId is available', async () => {
        mockUserDatabase.detectPlatform.mockReturnValue('kick');
        mockUserDatabase.getUserByUsername.mockResolvedValue(null);
        mockUserDatabase.getOrCreateUser.mockResolvedValue({ _id: 'k999' });
        mockUserDatabase.getUserCurrency.mockResolvedValue(0);
        mockUserDatabase.clampCurrency.mockReturnValue(10);

        const trigger = {
            metadata: {
                chatMessage: { userId: 'k999' }
            }
        } as unknown as Trigger;
        const event = buildEvent({ platform: 'auto-detect', username: 'newuser', action: 'Set', amount: 10 }, trigger);
        const result = await updatePlatformUserCurrencyEffect.onTriggerEvent(event as any);

        expect(result).toBe(true);
        expect(mockUserDatabase.getOrCreateUser).toHaveBeenCalledWith('kick', 'k999', 'newuser');
    });

    it('uses chatMessage userId when multiple userId fields are present', async () => {
        mockUserDatabase.detectPlatform.mockReturnValue('kick');
        mockUserDatabase.getUserByUsername.mockResolvedValue({ _id: 'k123' });
        mockUserDatabase.getUserCurrency.mockResolvedValue(0);
        mockUserDatabase.clampCurrency.mockReturnValue(5);

        const trigger = {
            metadata: {
                chatMessage: { userId: 'kchat' },
                eventData: { userId: 'kevent' },
                user: { id: 'kuser' }
            }
        } as unknown as Trigger;
        const event = buildEvent({ platform: 'auto-detect', username: 'user' }, trigger);
        const result = await updatePlatformUserCurrencyEffect.onTriggerEvent(event as any);

        expect(result).toBe(true);
        expect(mockUserDatabase.detectPlatform).toHaveBeenCalledWith('kchat', 'user', trigger);
    });

    it('fails when trigger userId is unprefixed for auto-create', async () => {
        mockUserDatabase.detectPlatform.mockReturnValue('kick');
        mockUserDatabase.getUserByUsername.mockResolvedValue(null);

        const trigger = {
            metadata: {
                chatMessage: { userId: '123' }
            }
        } as Trigger;
        const event = buildEvent({ platform: 'auto-detect', username: 'user' }, trigger);
        const result = await updatePlatformUserCurrencyEffect.onTriggerEvent(event as any);

        expect(result).toBe(false);
        expect(mockUserDatabase.getOrCreateUser).not.toHaveBeenCalled();
    });

    it('fails when trigger userId is empty for auto-create', async () => {
        mockUserDatabase.detectPlatform.mockReturnValue('kick');
        mockUserDatabase.getUserByUsername.mockResolvedValue(null);

        const trigger = {
            metadata: {
                chatMessage: { userId: '' }
            }
        } as unknown as Trigger;
        const event = buildEvent({ platform: 'auto-detect', username: 'user' }, trigger);
        const result = await updatePlatformUserCurrencyEffect.onTriggerEvent(event as any);

        expect(result).toBe(false);
        expect(mockUserDatabase.getOrCreateUser).not.toHaveBeenCalled();
    });

    it('fails when trigger userId is undefined for auto-create', async () => {
        mockUserDatabase.detectPlatform.mockReturnValue('kick');
        mockUserDatabase.getUserByUsername.mockResolvedValue(null);

        const trigger = {
            metadata: {
                chatMessage: { userId: undefined }
            }
        } as unknown as Trigger;
        const event = buildEvent({ platform: 'auto-detect', username: 'user' }, trigger);
        const result = await updatePlatformUserCurrencyEffect.onTriggerEvent(event as any);

        expect(result).toBe(false);
        expect(mockUserDatabase.getOrCreateUser).not.toHaveBeenCalled();
    });

    it('rejects invalid amount values', async () => {
        const event = buildEvent({ platform: 'twitch', amount: 'not-a-number' });
        const result = await updatePlatformUserCurrencyEffect.onTriggerEvent(event as any);

        expect(result).toBe(false);
    });

    it('rejects infinity amounts', async () => {
        const event = buildEvent({ platform: 'twitch', amount: Infinity });
        const result = await updatePlatformUserCurrencyEffect.onTriggerEvent(event as any);

        expect(result).toBe(false);
    });

    it('rejects negative infinity amounts', async () => {
        const event = buildEvent({ platform: 'twitch', amount: -Infinity });
        const result = await updatePlatformUserCurrencyEffect.onTriggerEvent(event as any);

        expect(result).toBe(false);
    });
});
