import type { ReplaceVariable } from '@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager';
import type { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import type { PlatformUserDatabase } from '../internal/platform-user-database';
import { createPlatformCurrencyEvaluator } from '../internal/variable-helpers';
import { firebot, logger } from '../main';

export function createPlatformCurrencyVariable(
    userDatabase: PlatformUserDatabase
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
        evaluator: createPlatformCurrencyEvaluator({
            userDatabase,
            variableName: 'platformCurrency',
            handleTwitch: async (username, normalizedUsername, currencyId) => {
                const { currencyManagerNew } = firebot.modules as unknown as {
                    currencyManagerNew: {
                        getViewerCurrencyAmount: (username: string, currencyId: string) => Promise<number>;
                    };
                };
                logger.debug(`platformCurrency: Getting Twitch currency for ${username}, currencyId: ${currencyId}`);
                return await currencyManagerNew.getViewerCurrencyAmount(normalizedUsername, currencyId);
            },
            handlePlatformDb: async (user, platform, currencyId) => {
                logger.debug(`platformCurrency: Getting ${platform} currency for ${user.username}, userId: ${user._id}, currencyId: ${currencyId}`);
                return await userDatabase.getUserCurrency(platform, user._id, currencyId);
            }
        })
    };
}

/**
 * Creates an override variable for currency
 * Matches Firebot's built-in signature: (trigger, currencyName, username?)
 * But adds optional platform parameter at the end
 */
export function createCurrencyOverride(
    userDatabase: PlatformUserDatabase
): ReplaceVariable {
    const baseVariable = createPlatformCurrencyVariable(userDatabase);

    return {
        definition: {
            ...baseVariable.definition,
            handle: 'currency',
            description: 'Gets currency amount for a user on Twitch, Kick, or YouTube by username',
            usage: 'currency[currencyName, username?, platform?]',
            examples: [
                {
                    usage: 'currency[points]',
                    description: 'Get points balance for the current user'
                },
                {
                    usage: 'currency[points, testuser]',
                    description: 'Get points balance for a specific user'
                },
                {
                    usage: 'currency[points, testuser, kick]',
                    description: 'Get points balance for a specific user on a specific platform'
                }
            ]
        },
        evaluator: async (
            trigger: Trigger,
            currencyName?: string,
            username?: string,
            platform?: string
        ): Promise<number> => {
            // Call the base evaluator with platform as the fourth parameter
            return baseVariable.evaluator(trigger, currencyName, username, platform);
        }
    };
}
