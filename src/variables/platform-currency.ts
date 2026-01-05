import type { ReplaceVariable } from '@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager';
import type { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import type { PlatformUserDatabase } from '../internal/platform-user-database';
import type { LogWrapper } from '../main';
import { resolveCurrencyId } from '../internal/currency-helpers';

export function createPlatformCurrencyVariable(
    userDatabase: PlatformUserDatabase,
    logger: LogWrapper
): ReplaceVariable {
    return {
        definition: {
            handle: 'platformCurrency',
            description: 'Gets currency amount for a user on Kick or YouTube by username',
            usage: 'platformCurrency[username, currencyIdOrName, platform?]',
            examples: [
                {
                    usage: 'platformCurrency[staticmage, points, kick]',
                    description: 'Get Kick user points balance by username'
                },
                {
                    usage: 'platformCurrency[thestaticmage@youtube, coins]',
                    description: 'Get YouTube user coins balance by username with suffix'
                }
            ],
            categories: ['common', 'user based'],
            possibleDataOutput: ['number']
        },
        evaluator: async (
            trigger: Trigger,
            username?: string,
            currencyIdOrName?: string,
            platform?: string
        ): Promise<number> => {
            try {
                if (!username || !currencyIdOrName) {
                    logger.debug('platformCurrency: Missing username or currencyIdOrName');
                    return 0;
                }

                let targetPlatform = platform;
                if (!targetPlatform || targetPlatform === 'unknown') {
                    targetPlatform = userDatabase.detectPlatform(undefined, username, trigger);
                }
                if (!targetPlatform || targetPlatform === 'unknown') {
                    logger.debug(`platformCurrency: Cannot determine platform for username ${username}`);
                    return 0;
                }
                if (targetPlatform !== 'kick' && targetPlatform !== 'youtube') {
                    logger.error(`platformCurrency: Platform ${targetPlatform} not supported`);
                    return 0;
                }

                const normalizedUsername = userDatabase.normalizeUsername(username);
                const user = await userDatabase.getUserByUsername(normalizedUsername, targetPlatform);
                if (!user) {
                    logger.debug(`platformCurrency: User not found for ${normalizedUsername}`);
                    return 0;
                }

                const { currencyId, found } = resolveCurrencyId(currencyIdOrName);
                if (!found || !currencyId) {
                    logger.debug(`platformCurrency: Currency '${currencyIdOrName}' not found`);
                    return 0;
                }

                return await userDatabase.getUserCurrency(targetPlatform, user._id, currencyId);
            } catch (error) {
                logger.debug(`platformCurrency error: ${error}`);
                return 0;
            }
        }
    };
}
