import type { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import type { PlatformUser } from '../types/platform-user';
import { resolveCurrencyId } from './currency-helpers';
import type { PlatformUserDatabase } from './platform-user-database';
import { determineTargetPlatform, extractTriggerUsername, normalizeUsername } from './trigger-helpers';
import { logger } from '../main';

export interface PlatformVariableEvaluatorOptions<T> {
    userDatabase: PlatformUserDatabase;
    variableName: string;
    defaultValue: T;
    handleTwitch: (username: string, normalizedUsername: string) => Promise<T>;
    handlePlatformDb: (user: PlatformUser, platform: string, username: string) => Promise<T>;
}

export function createPlatformVariableEvaluator<T>(
    options: PlatformVariableEvaluatorOptions<T>
) {
    return async (
        trigger: Trigger,
        username?: string,
        platform?: string
    ): Promise<T> => {
        try {
            let targetUsername: string | undefined = username;
            if (!targetUsername) {
                targetUsername = extractTriggerUsername(trigger) || undefined;
            }

            if (!targetUsername) {
                logger.debug(`${options.variableName}: No username provided`);
                return options.defaultValue;
            }

            const targetPlatform = determineTargetPlatform(platform, targetUsername, trigger);

            if (!targetPlatform || targetPlatform === 'unknown') {
                logger.debug(`${options.variableName}: Cannot determine platform for username ${targetUsername}`);
                return options.defaultValue;
            }

            if (targetPlatform === 'twitch') {
                const normalizedTwitchUsername = normalizeUsername(targetUsername);
                return await options.handleTwitch(targetUsername, normalizedTwitchUsername);
            }

            if (targetPlatform === 'kick' || targetPlatform === 'youtube') {
                const normalizedUsername = normalizeUsername(targetUsername);
                const user = await options.userDatabase.getUserByUsername(normalizedUsername, targetPlatform);
                if (!user) {
                    logger.debug(`${options.variableName}: User not found for ${normalizedUsername}`);
                    return options.defaultValue;
                }
                return await options.handlePlatformDb(user, targetPlatform, targetUsername);
            }

            logger.debug(`${options.variableName}: Platform ${targetPlatform} not supported`);
            return options.defaultValue;
        } catch (error) {
            logger.debug(`${options.variableName} error: ${error}`);
            return options.defaultValue;
        }
    };
}

export interface PlatformCurrencyEvaluatorOptions {
    userDatabase: PlatformUserDatabase;
    variableName: string;
    handleTwitch: (username: string, normalizedUsername: string, currencyId: string) => Promise<number>;
    handlePlatformDb: (user: PlatformUser, platform: string, currencyId: string) => Promise<number>;
}

export function createPlatformCurrencyEvaluator(
    options: PlatformCurrencyEvaluatorOptions
) {
    return async (
        trigger: Trigger,
        currencyIdOrName: string,
        username: string,
        platform?: string
    ): Promise<number> => {
        try {
            if (!currencyIdOrName || !username) {
                logger.debug(`${options.variableName}: Missing currencyIdOrName or username`);
                return 0;
            }

            const { currencyId, found } = resolveCurrencyId(currencyIdOrName);
            if (!found || !currencyId) {
                logger.warn(`${options.variableName}: Currency '${currencyIdOrName}' not resolved or found (currencyId: ${currencyId}, found: ${found})`);
                return 0;
            }

            let targetPlatform = platform;
            if (!targetPlatform || targetPlatform === 'unknown') {
                targetPlatform = options.userDatabase.detectPlatform(undefined, username, trigger);
            }
            if (!targetPlatform || targetPlatform === 'unknown') {
                logger.debug(`${options.variableName}: Cannot determine platform for username ${username}`);
                return 0;
            }

            if (targetPlatform === 'twitch') {
                const normalizedTwitchUsername = normalizeUsername(username);
                return await options.handleTwitch(username, normalizedTwitchUsername, currencyId);
            }

            if (targetPlatform !== 'kick' && targetPlatform !== 'youtube') {
                logger.error(`${options.variableName}: Platform ${targetPlatform} not supported`);
                return 0;
            }

            const normalizedUsername = normalizeUsername(username);
            const user = await options.userDatabase.getUserByUsername(normalizedUsername, targetPlatform);
            if (!user) {
                logger.debug(`${options.variableName}: User not found for ${normalizedUsername}`);
                return 0;
            }

            return await options.handlePlatformDb(user, targetPlatform, currencyId);
        } catch (error) {
            logger.debug(`${options.variableName} error: ${error}`);
            return 0;
        }
    };
}

export interface PlatformMetadataEvaluatorOptions {
    userDatabase: PlatformUserDatabase;
    variableName: string;
    handleTwitch: (normalizedUsername: string, key: string, propertyPath: string | null) => Promise<unknown>;
    handlePlatformDb: (user: PlatformUser, key: string, propertyPath: string | null) => Promise<unknown>;
}

export function createPlatformMetadataEvaluator(
    options: PlatformMetadataEvaluatorOptions
) {
    return async (
        trigger: Trigger,
        username: string,
        key: string,
        defaultValue: unknown = null,
        propertyPath: string | null = null,
        platform: string | null = null
    ): Promise<unknown> => {
        try {
            if (!username || !key) {
                logger.debug(`${options.variableName}: Missing username or key`);
                return defaultValue;
            }

            const targetPlatform = determineTargetPlatform(platform, username, trigger);

            if (!targetPlatform || targetPlatform === 'unknown') {
                logger.debug(`${options.variableName}: Cannot determine platform for username ${username}`);
                return defaultValue;
            }

            if (targetPlatform === 'twitch') {
                logger.debug(`${options.variableName}: Getting Twitch metadata for ${username}, key: ${key}`);
                const normalizedTwitchUsername = normalizeUsername(username);
                const data = await options.handleTwitch(normalizedTwitchUsername, key, propertyPath);
                if (data == null) {
                    return defaultValue;
                }
                return data;
            }

            if (targetPlatform === 'kick' || targetPlatform === 'youtube') {
                logger.debug(`${options.variableName}: Getting ${targetPlatform} metadata for ${username}, key: ${key}`);
                const normalizedUsername = normalizeUsername(username);
                const user = await options.userDatabase.getUserByUsername(normalizedUsername, targetPlatform);

                if (!user) {
                    logger.debug(`${options.variableName}: User not found for ${normalizedUsername}`);
                    return defaultValue;
                }

                const data = await options.handlePlatformDb(user, key, propertyPath);
                if (data == null) {
                    return defaultValue;
                }
                return data;
            }

            logger.debug(`${options.variableName}: Platform ${targetPlatform} not supported for metadata`);
            return defaultValue;
        } catch (error) {
            logger.debug(`${options.variableName} error: ${error}`);
            return defaultValue;
        }
    };
}
