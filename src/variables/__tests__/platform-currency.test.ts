import type { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import { createPlatformCurrencyVariable } from '../platform-currency';
import { firebot } from '../../main';
import type { LogWrapper } from '../../main';

jest.mock('../../main', () => ({
    firebot: {
        modules: {
            currencyAccess: {
                getCurrencyById: jest.fn(),
                getCurrencyByName: jest.fn()
            },
            currencyManagerNew: {
                getViewerCurrencyAmount: jest.fn(),
                getViewerCurrencies: jest.fn()
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

    describe('platformCurrency', () => {
        it('returns 0 when inputs are missing', async () => {
            const userDatabase = {
                detectPlatform: jest.fn(),
                getUserByUsername: jest.fn(),
                getUserCurrency: jest.fn()
            };

            const variable = createPlatformCurrencyVariable(userDatabase as any, logger);
            const result = await variable.evaluator({} as Trigger, 'points', undefined, 'kick');

            expect(result).toBe(0);
        });

        it('returns currency amount for a user by username', async () => {
            const userDatabase = {
                detectPlatform: jest.fn(),
                getUserByUsername: jest.fn().mockResolvedValue({ _id: 'k123' }),
                getUserCurrency: jest.fn().mockResolvedValue(15)
            };
            const currencyAccess = (firebot.modules as any).currencyAccess;
            currencyAccess.getCurrencyById.mockReturnValue({ id: 'points' });

            const variable = createPlatformCurrencyVariable(userDatabase as any, logger);
            const result = await variable.evaluator({} as Trigger, 'points', 'User', 'kick');

            expect(result).toBe(15);
        });

        it('returns 0 when user is not found', async () => {
            const userDatabase = {
                detectPlatform: jest.fn(),
                getUserByUsername: jest.fn().mockResolvedValue(null),
                getUserCurrency: jest.fn()
            };
            const currencyAccess = (firebot.modules as any).currencyAccess;
            currencyAccess.getCurrencyById.mockReturnValue({ id: 'points' });

            const variable = createPlatformCurrencyVariable(userDatabase as any, logger);
            const result = await variable.evaluator({} as Trigger, 'points', 'User', 'kick');

            expect(result).toBe(0);
        });

        it('returns 0 when currency is not found', async () => {
            const userDatabase = {
                detectPlatform: jest.fn(),
                getUserByUsername: jest.fn().mockResolvedValue({ _id: 'k123' }),
                getUserCurrency: jest.fn()
            };
            const currencyAccess = (firebot.modules as any).currencyAccess;
            currencyAccess.getCurrencyById.mockReturnValue(null);
            currencyAccess.getCurrencyByName.mockReturnValue(null);

            const variable = createPlatformCurrencyVariable(userDatabase as any, logger);
            const result = await variable.evaluator({} as Trigger, 'points', 'User', 'kick');

            expect(result).toBe(0);
        });

        it('auto-detects platform when not provided', async () => {
            const userDatabase = {
                detectPlatform: jest.fn().mockReturnValue('youtube'),
                getUserByUsername: jest.fn().mockResolvedValue({ _id: 'yUC123' }),
                getUserCurrency: jest.fn().mockResolvedValue(3)
            };
            const currencyAccess = (firebot.modules as any).currencyAccess;
            currencyAccess.getCurrencyById.mockReturnValue({ id: 'points' });

            const variable = createPlatformCurrencyVariable(userDatabase as any, logger);
            const result = await variable.evaluator({} as Trigger, 'points', 'User@YouTube');

            expect(result).toBe(3);
        });

        it('returns 0 when normalizeUsername throws', async () => {
            const userDatabase = {
                detectPlatform: jest.fn(),
                getUserByUsername: jest.fn(),
                getUserCurrency: jest.fn()
            };
            const currencyAccess = (firebot.modules as any).currencyAccess;
            currencyAccess.getCurrencyById.mockReturnValue({ id: 'points' });

            const variable = createPlatformCurrencyVariable(userDatabase as any, logger);
            const result = await variable.evaluator({} as Trigger, 'points', '@kick', 'kick');

            expect(result).toBe(0);
        });

        it('returns currency amount for Twitch user', async () => {
            const userDatabase = {
                detectPlatform: jest.fn(),
                getUserByUsername: jest.fn(),
                getUserCurrency: jest.fn()
            };
            const currencyAccess = (firebot.modules as any).currencyAccess;
            const currencyManagerNew = (firebot.modules as any).currencyManagerNew;
            currencyAccess.getCurrencyById.mockReturnValue({ id: 'points' });
            currencyManagerNew.getViewerCurrencyAmount.mockResolvedValue(24);

            const variable = createPlatformCurrencyVariable(userDatabase as any, logger);
            const result = await variable.evaluator({} as Trigger, 'points', 'TestUser', 'twitch');

            expect(result).toBe(24);
            expect(currencyManagerNew.getViewerCurrencyAmount).toHaveBeenCalledWith('testuser', 'points');
        });

        it('returns 0 for unsupported platform', async () => {
            const userDatabase = {
                detectPlatform: jest.fn(),
                getUserByUsername: jest.fn(),
                getUserCurrency: jest.fn()
            };

            const variable = createPlatformCurrencyVariable(userDatabase as any, logger);
            const result = await variable.evaluator({} as Trigger, 'points', 'User', 'facebook');

            expect(result).toBe(0);
        });
    });
});
