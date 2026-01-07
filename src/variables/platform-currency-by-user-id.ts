import type { ReplaceVariable } from '@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager';
import type { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import type { PlatformUserDatabase } from '../internal/platform-user-database';
import { firebot } from '../main';
import type { LogWrapper } from '../main';
import { resolveCurrencyId } from '../internal/currency-helpers';

export function createPlatformCurrencyByUserIdVariable(
    userDatabase: PlatformUserDatabase,
    logger: LogWrapper
): ReplaceVariable {
    return {
        definition: {
            handle: 'platformCurrencyByUserId',
            description: 'Gets currency amount for a user on Twitch, Kick, or YouTube by user ID',
            usage: 'platformCurrencyByUserId[userId, currencyIdOrName]',
            examples: [
                {
                    usage: 'platformCurrencyByUserId[k12345, points]',
                    description: 'Get Kick user points balance'
                },
                {
                    usage: 'platformCurrencyByUserId[123456789, points]',
                    description: 'Get Twitch user points balance'
                },
                {
                    usage: 'platformCurrencyByUserId[$userId, coins]',
                    description: 'Get the triggering user currency balance'
                }
            ],
            categories: ['common', 'user based'],
            possibleDataOutput: ['number']
        },
        evaluator: async (
            trigger: Trigger,
            userId?: string,
            currencyIdOrName?: string
        ): Promise<number> => {
            try {
                if (!userId || !currencyIdOrName) {
                    logger.debug('platformCurrencyByUserId: Missing userId or currencyIdOrName');
                    return 0;
                }

                const targetPlatform = userDatabase.detectPlatform(userId, undefined, trigger);
                if (!targetPlatform || targetPlatform === 'unknown') {
                    logger.debug(`platformCurrencyByUserId: Cannot determine platform for user ${userId}`);
                    return 0;
                }

                const { currencyId, found } = resolveCurrencyId(currencyIdOrName);
                if (!found || !currencyId) {
                    logger.debug(`platformCurrencyByUserId: Currency '${currencyIdOrName}' not found`);
                    return 0;
                }

                if (targetPlatform === 'twitch') {
                    const { currencyManagerNew } = firebot.modules as unknown as {
                        currencyManagerNew: {
                            getViewerCurrencies: (usernameOrId: string, isUsername?: boolean) => Promise<Record<string, number> | null>;
                        };
                    };
                    const currencies = await currencyManagerNew.getViewerCurrencies(userId, false);
                    return currencies?.[currencyId] ?? 0;
                }

                if (targetPlatform !== 'kick' && targetPlatform !== 'youtube') {
                    logger.debug(`platformCurrencyByUserId: Platform ${targetPlatform} not supported`);
                    return 0;
                }

                return await userDatabase.getUserCurrency(targetPlatform, userId, currencyId);
            } catch (error) {
                const message = String(error);
                if (message.toLowerCase().includes('user id')) {
                    logger.error(`platformCurrencyByUserId: ${message}`);
                } else {
                    logger.debug(`platformCurrencyByUserId error: ${message}`);
                }
                return 0;
            }
        }
    };
}
