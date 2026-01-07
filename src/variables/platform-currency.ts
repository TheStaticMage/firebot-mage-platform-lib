import type { ReplaceVariable } from '@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager';
import type { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import { resolveCurrencyId } from '../internal/currency-helpers';
import type { PlatformUserDatabase } from '../internal/platform-user-database';
import { normalizeUsername } from '../internal/trigger-helpers';
import type { LogWrapper } from '../main';
import { firebot } from '../main';

export function createPlatformCurrencyVariable(
    userDatabase: PlatformUserDatabase,
    logger: LogWrapper
): ReplaceVariable {
    return {
        definition: {
            handle: 'platformCurrency',
            description: 'Gets currency amount for a user on Twitch, Kick, or YouTube by username',
            usage: 'platformCurrency[currencyIdOrName, username, platform?]',
            examples: [
                {
                    usage: 'platformCurrency[points, staticmage, kick]',
                    description: 'Get Kick user points balance by username'
                },
                {
                    usage: 'platformCurrency[points, thestaticmage, twitch]',
                    description: 'Get Twitch user points balance by username'
                },
                {
                    usage: 'platformCurrency[coins, thestaticmage@youtube]',
                    description: 'Get YouTube user coins balance by username with suffix'
                }
            ],
            categories: ['common', 'user based'],
            possibleDataOutput: ['number']
        },
        evaluator: async (
            trigger: Trigger,
            currencyIdOrName?: string,
            username?: string,
            platform?: string
        ): Promise<number> => {
            try {
                if (!currencyIdOrName || !username) {
                    logger.debug('platformCurrency: Missing currencyIdOrName or username');
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

                const { currencyId, found } = resolveCurrencyId(currencyIdOrName);
                if (!found || !currencyId) {
                    logger.warn(`platformCurrency: Currency '${currencyIdOrName}' not resolved or found (platform: ${targetPlatform}, user: ${username}, currencyId: ${currencyId}, found: ${found})`);
                    return 0;
                }

                if (targetPlatform === 'twitch') {
                    const { currencyManagerNew } = firebot.modules as unknown as {
                        currencyManagerNew: {
                            getViewerCurrencyAmount: (username: string, currencyId: string) => Promise<number>;
                        };
                    };
                    logger.debug(`platformCurrency: Getting Twitch currency for ${username}, currencyId: ${currencyId}`);
                    const twitchUsername = normalizeUsername(username);
                    return await currencyManagerNew.getViewerCurrencyAmount(twitchUsername, currencyId);
                }

                if (targetPlatform !== 'kick' && targetPlatform !== 'youtube') {
                    logger.error(`platformCurrency: Platform ${targetPlatform} not supported`);
                    return 0;
                }

                const normalizedUsername = normalizeUsername(username);
                const user = await userDatabase.getUserByUsername(normalizedUsername, targetPlatform);
                if (!user) {
                    logger.debug(`platformCurrency: User not found for ${normalizedUsername}`);
                    return 0;
                }

                logger.debug(`platformCurrency: Getting ${targetPlatform} currency for ${normalizedUsername}, userId: ${user._id}, currencyId: ${currencyId}`);
                return await userDatabase.getUserCurrency(targetPlatform, user._id, currencyId);
            } catch (error) {
                logger.debug(`platformCurrency error: ${error}`);
                return 0;
            }
        }
    };
}
