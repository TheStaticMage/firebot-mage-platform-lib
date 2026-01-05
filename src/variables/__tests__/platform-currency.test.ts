import type { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import { createPlatformCurrencyByUserIdVariable } from '../platform-currency-by-user-id';
import { createPlatformCurrencyVariable } from '../platform-currency';
import { firebot } from '../../main';
import type { LogWrapper } from '../../main';

jest.mock('../../main', () => ({
    firebot: {
        modules: {
            currencyAccess: {
                getCurrencyById: jest.fn(),
                getCurrencyByName: jest.fn()
            }
        }
    }
}));

describe('platform currency variables', () => {
    const logger = {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn()
    } as unknown as LogWrapper;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('platformCurrencyByUserId', () => {
        it('returns currency amount for Kick user', async () => {
            const userDatabase = {
                detectPlatform: jest.fn().mockReturnValue('kick'),
                getUserCurrency: jest.fn().mockResolvedValue(42)
            };
            const currencyAccess = (firebot.modules as any).currencyAccess;
            currencyAccess.getCurrencyById.mockReturnValue({ _id: 'points' });

            const variable = createPlatformCurrencyByUserIdVariable(userDatabase as any, logger);
            const result = await variable.evaluator({} as Trigger, 'k123', 'points');

            expect(result).toBe(42);
        });

        it('returns 0 when inputs are missing', async () => {
            const userDatabase = {
                detectPlatform: jest.fn(),
                getUserCurrency: jest.fn()
            };

            const variable = createPlatformCurrencyByUserIdVariable(userDatabase as any, logger);
            const result = await variable.evaluator({} as Trigger, undefined, 'points');

            expect(result).toBe(0);
        });

        it('returns 0 when platform is twitch', async () => {
            const userDatabase = {
                detectPlatform: jest.fn().mockReturnValue('twitch'),
                getUserCurrency: jest.fn()
            };

            const variable = createPlatformCurrencyByUserIdVariable(userDatabase as any, logger);
            const result = await variable.evaluator({} as Trigger, 'k123', 'points');

            expect(result).toBe(0);
        });

        it('returns 0 when platform is unknown', async () => {
            const userDatabase = {
                detectPlatform: jest.fn().mockReturnValue('unknown'),
                getUserCurrency: jest.fn()
            };

            const variable = createPlatformCurrencyByUserIdVariable(userDatabase as any, logger);
            const result = await variable.evaluator({} as Trigger, 'k123', 'points');

            expect(result).toBe(0);
        });

        it('falls back to currency name lookup', async () => {
            const userDatabase = {
                detectPlatform: jest.fn().mockReturnValue('kick'),
                getUserCurrency: jest.fn().mockResolvedValue(7)
            };
            const currencyAccess = (firebot.modules as any).currencyAccess;
            currencyAccess.getCurrencyById.mockReturnValue(null);
            currencyAccess.getCurrencyByName.mockReturnValue({ _id: 'points' });

            const variable = createPlatformCurrencyByUserIdVariable(userDatabase as any, logger);
            const result = await variable.evaluator({} as Trigger, 'k123', 'Points');

            expect(result).toBe(7);
        });

        it('returns 0 when currency is not found', async () => {
            const userDatabase = {
                detectPlatform: jest.fn().mockReturnValue('kick'),
                getUserCurrency: jest.fn()
            };
            const currencyAccess = (firebot.modules as any).currencyAccess;
            currencyAccess.getCurrencyById.mockReturnValue(null);
            currencyAccess.getCurrencyByName.mockReturnValue(null);

            const variable = createPlatformCurrencyByUserIdVariable(userDatabase as any, logger);
            const result = await variable.evaluator({} as Trigger, 'k123', 'Points');

            expect(result).toBe(0);
        });

        it('returns 0 when user ID is invalid', async () => {
            const userDatabase = {
                detectPlatform: jest.fn().mockReturnValue('kick'),
                getUserCurrency: jest.fn().mockRejectedValue(new Error('User ID must be platform-prefixed'))
            };
            const currencyAccess = (firebot.modules as any).currencyAccess;
            currencyAccess.getCurrencyById.mockReturnValue({ _id: 'points' });

            const variable = createPlatformCurrencyByUserIdVariable(userDatabase as any, logger);
            const result = await variable.evaluator({} as Trigger, '123', 'points');

            expect(result).toBe(0);
        });
    });

    describe('platformCurrency', () => {
        it('returns 0 when inputs are missing', async () => {
            const userDatabase = {
                detectPlatform: jest.fn(),
                normalizeUsername: jest.fn(),
                getUserByUsername: jest.fn(),
                getUserCurrency: jest.fn()
            };

            const variable = createPlatformCurrencyVariable(userDatabase as any, logger);
            const result = await variable.evaluator({} as Trigger, undefined, 'points', 'kick');

            expect(result).toBe(0);
        });

        it('returns currency amount for a user by username', async () => {
            const userDatabase = {
                detectPlatform: jest.fn(),
                normalizeUsername: jest.fn().mockReturnValue('user'),
                getUserByUsername: jest.fn().mockResolvedValue({ _id: 'k123' }),
                getUserCurrency: jest.fn().mockResolvedValue(15)
            };
            const currencyAccess = (firebot.modules as any).currencyAccess;
            currencyAccess.getCurrencyById.mockReturnValue({ _id: 'points' });

            const variable = createPlatformCurrencyVariable(userDatabase as any, logger);
            const result = await variable.evaluator({} as Trigger, 'User', 'points', 'kick');

            expect(result).toBe(15);
        });

        it('returns 0 when user is not found', async () => {
            const userDatabase = {
                detectPlatform: jest.fn(),
                normalizeUsername: jest.fn().mockReturnValue('user'),
                getUserByUsername: jest.fn().mockResolvedValue(null),
                getUserCurrency: jest.fn()
            };
            const currencyAccess = (firebot.modules as any).currencyAccess;
            currencyAccess.getCurrencyById.mockReturnValue({ _id: 'points' });

            const variable = createPlatformCurrencyVariable(userDatabase as any, logger);
            const result = await variable.evaluator({} as Trigger, 'User', 'points', 'kick');

            expect(result).toBe(0);
        });

        it('returns 0 when currency is not found', async () => {
            const userDatabase = {
                detectPlatform: jest.fn(),
                normalizeUsername: jest.fn().mockReturnValue('user'),
                getUserByUsername: jest.fn().mockResolvedValue({ _id: 'k123' }),
                getUserCurrency: jest.fn()
            };
            const currencyAccess = (firebot.modules as any).currencyAccess;
            currencyAccess.getCurrencyById.mockReturnValue(null);
            currencyAccess.getCurrencyByName.mockReturnValue(null);

            const variable = createPlatformCurrencyVariable(userDatabase as any, logger);
            const result = await variable.evaluator({} as Trigger, 'User', 'points', 'kick');

            expect(result).toBe(0);
        });

        it('auto-detects platform when not provided', async () => {
            const userDatabase = {
                detectPlatform: jest.fn().mockReturnValue('youtube'),
                normalizeUsername: jest.fn().mockReturnValue('user'),
                getUserByUsername: jest.fn().mockResolvedValue({ _id: 'yUC123' }),
                getUserCurrency: jest.fn().mockResolvedValue(3)
            };
            const currencyAccess = (firebot.modules as any).currencyAccess;
            currencyAccess.getCurrencyById.mockReturnValue({ _id: 'points' });

            const variable = createPlatformCurrencyVariable(userDatabase as any, logger);
            const result = await variable.evaluator({} as Trigger, 'User@YouTube', 'points');

            expect(result).toBe(3);
        });

        it('returns 0 when normalizeUsername throws', async () => {
            const userDatabase = {
                detectPlatform: jest.fn(),
                normalizeUsername: jest.fn(() => {
                    throw new Error('bad username');
                }),
                getUserByUsername: jest.fn(),
                getUserCurrency: jest.fn()
            };
            const currencyAccess = (firebot.modules as any).currencyAccess;
            currencyAccess.getCurrencyById.mockReturnValue({ _id: 'points' });

            const variable = createPlatformCurrencyVariable(userDatabase as any, logger);
            const result = await variable.evaluator({} as Trigger, 'User', 'points', 'kick');

            expect(result).toBe(0);
        });

        it('returns 0 for unsupported platform', async () => {
            const userDatabase = {
                detectPlatform: jest.fn(),
                normalizeUsername: jest.fn(),
                getUserByUsername: jest.fn(),
                getUserCurrency: jest.fn()
            };

            const variable = createPlatformCurrencyVariable(userDatabase as any, logger);
            const result = await variable.evaluator({} as Trigger, 'User', 'points', 'twitch');

            expect(result).toBe(0);
        });
    });
});
