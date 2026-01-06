import fs from 'fs';
import path from 'path';
import Datastore from '@seald-io/nedb';
import type { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import { detectPlatform as detectTriggerPlatform } from '@thestaticmage/mage-platform-lib-client';
import { firebot } from '../main';
import type { PlatformUser } from '../types/platform-user';
import { LogWrapper } from '../main';

export interface MigrationConflict {
    type: 'id' | 'username';
    kickUserId: string;
    kickUsername: string;
    existingUserId: string;
    reason: string;
}

export interface MigrationResult {
    migrated: number;
    skipped: number;
    conflicts: MigrationConflict[];
}

type KickUserRecord = {
    _id?: string;
    username?: string;
    displayName?: string;
    profilePicUrl?: string;
    lastSeen?: number;
    currency?: Record<string, number>;
    metadata?: Record<string, unknown>;
    chatMessages?: number;
    minutesInChannel?: number;
    twitchRoles?: string[];
};

export class PlatformUserDatabase {
    private db?: Datastore<PlatformUser>;
    private logger: LogWrapper;
    private scriptDataDir: string;
    private _dbCompactionInterval = 30000;
    private static readonly YOUTUBE_ID_REGEX = /^yUC[A-Za-z0-9_-]+$/;

    constructor(scriptDataDir: string, logger: LogWrapper) {
        this.scriptDataDir = scriptDataDir;
        this.logger = logger;
    }

    /**
     * Initialize the platform user database.
     * @throws Error when initialization cannot be recovered.
     */
    async initialize(): Promise<void> {
        const dbPath = path.join(this.scriptDataDir, 'platform-users.db');

        try {
            this.db = new Datastore<PlatformUser>({
                filename: dbPath,
                autoload: false
            });

            this.db.setAutocompactionInterval(this._dbCompactionInterval);
            await this.db.loadDatabaseAsync();
            this.logger.info('Platform user database initialized successfully');
        } catch (error) {
            this.logger.error(`Failed to load platform user database: ${error}`);

            try {
                const backupPath = path.join(
                    this.scriptDataDir,
                    `platform-users.db.corrupt.${Date.now()}`
                );
                await fs.promises.rename(dbPath, backupPath);
                this.logger.error(`Renamed corrupt database file to: ${backupPath}`);
            } catch (renameError) {
                if ((renameError as NodeJS.ErrnoException).code === 'ENOENT') {
                    this.logger.debug('Database file does not exist, creating new');
                } else {
                    this.logger.debug(`Could not rename database file: ${renameError}`);
                }
            }

            try {
                this.db = new Datastore<PlatformUser>({
                    filename: dbPath,
                    autoload: false
                });
                this.db.setAutocompactionInterval(this._dbCompactionInterval);
                await this.db.loadDatabaseAsync();
                this.logger.info('Platform user database recreated after load failure');
            } catch (recoveryError) {
                this.logger.error(`Failed to recreate database: ${recoveryError}`);
                throw new Error(`Platform user database initialization failed: ${recoveryError}`);
            }
        }
    }

    /**
     * Detect a platform using ID prefix, username suffix, or trigger metadata.
     * @param userId Platform-prefixed user ID if available.
     * @param username Username that may include a platform suffix.
     * @param trigger Trigger metadata for fallback detection.
     * @returns Detected platform or "unknown".
     */
    detectPlatform(userId?: string, username?: string, trigger?: Trigger): string {
        if (userId) {
            const trimmedUserId = userId.trim();
            if (trimmedUserId.startsWith('k')) {
                return 'kick';
            }
            if (trimmedUserId.startsWith('y')) {
                return 'youtube';
            }
        }

        if (username) {
            const lowerUsername = username.toLowerCase();
            if (lowerUsername.endsWith('@kick')) {
                return 'kick';
            }
            if (lowerUsername.endsWith('@youtube')) {
                return 'youtube';
            }
        }

        if (trigger) {
            const platform = detectTriggerPlatform(trigger);
            if (platform && platform !== 'unknown') {
                return platform;
            }
        }

        return 'unknown';
    }

    private validatePlatform(platform: string): void {
        if (platform !== 'kick' && platform !== 'youtube') {
            throw new Error(`Invalid platform: ${platform} (only 'kick' and 'youtube' are supported)`);
        }
    }

    private validateUserId(userId: string): string {
        const trimmedUserId = userId.trim();

        if (userId.trim() !== userId) {
            throw new Error(`User ID contains leading or trailing whitespace: "${userId}"`);
        }
        if (trimmedUserId === '') {
            throw new Error('User ID is empty or whitespace-only');
        }

        if (trimmedUserId.startsWith('k')) {
            if (!/^k\d+$/.test(trimmedUserId)) {
                throw new Error(`Invalid Kick user ID format: ${trimmedUserId} (expected k followed by digits)`);
            }
            return trimmedUserId;
        }

        if (trimmedUserId.startsWith('y')) {
            if (!PlatformUserDatabase.YOUTUBE_ID_REGEX.test(trimmedUserId)) {
                throw new Error(`Invalid YouTube user ID format: ${trimmedUserId} (expected yUC followed by alphanumeric)`);
            }
            return trimmedUserId;
        }

        throw new Error(`User ID must be platform-prefixed (k for Kick, y for YouTube): ${trimmedUserId}`);
    }

    /**
     * Normalize a username by stripping platform suffixes and leading @.
     * @param username Raw username input.
     * @returns Normalized username.
     * @throws Error when normalization results in empty value.
     */
    normalizeUsername(username: string): string {
        let normalized = username.toLowerCase();

        if (normalized.endsWith('@kick')) {
            normalized = normalized.slice(0, -5);
        } else if (normalized.endsWith('@youtube')) {
            normalized = normalized.slice(0, -8);
        }

        if (normalized.startsWith('@')) {
            normalized = normalized.slice(1);
        }

        if (normalized.trim() === '') {
            throw new Error(`Username normalizes to empty string: "${username}"`);
        }

        return normalized;
    }

    private ensurePlatformPrefixForMigration(platform: string, userId: string): string {
        this.validatePlatform(platform);

        const trimmedUserId = userId.trim();
        if (trimmedUserId === '') {
            throw new Error('User ID is empty or whitespace-only');
        }

        if (platform === 'kick') {
            return trimmedUserId.startsWith('k') ? trimmedUserId : `k${trimmedUserId}`;
        }

        return trimmedUserId.startsWith('y') ? trimmedUserId : `y${trimmedUserId}`;
    }

    /**
     * Clamp a currency amount to non-negative and configured limits.
     * @param amount Value to clamp.
     * @param currencyId Currency identifier.
     * @returns Clamped amount.
     */
    clampCurrency(amount: number, currencyId: string): number {
        const { currencyAccess } = firebot.modules as unknown as {
            currencyAccess: {
                getCurrencyById: (id: string) => { limit: number } | null;
            };
        };
        const currency = currencyAccess.getCurrencyById(currencyId);

        if (!currency) {
            this.logger.debug(`Currency ${currencyId} not found, clamping to non-negative only`);
            return Math.max(amount, 0);
        }

        const nonNegative = Math.max(amount, 0);
        const currencyLimit = !isNaN(currency.limit) ? currency.limit : 0;

        if (currencyLimit > 0) {
            return Math.min(nonNegative, currencyLimit);
        }

        return nonNegative;
    }

    /**
     * Get a user by platform and ID.
     * @param platform Platform identifier.
     * @param userId Platform-prefixed user ID.
     * @returns User or null if not found or invalid.
     */
    async getUser(platform: string, userId: string): Promise<PlatformUser | null> {
        try {
            this.validatePlatform(platform);
            const db = this.ensureDb();
            const normalizedUserId = this.validateUserId(userId);
            const user = await db.findOneAsync({ _id: normalizedUserId });
            return user ? this.ensureUserRoles(user) : null;
        } catch (error) {
            this.logger.debug(`Failed to get user: ${error}`);
            return null;
        }
    }

    /**
     * Get a user by username and optional platform.
     * @param username Username to look up.
     * @param platform Optional platform, otherwise inferred from username suffix.
     * @returns User or null if not found or platform cannot be inferred.
     */
    async getUserByUsername(username: string, platform?: string): Promise<PlatformUser | null> {
        try {
            if (!username) {
                return null;
            }

            let targetPlatform = platform;
            if (!targetPlatform) {
                targetPlatform = this.detectPlatform(undefined, username, undefined);
            }
            if (!targetPlatform || targetPlatform === 'unknown') {
                return null;
            }

            this.validatePlatform(targetPlatform);

            const db = this.ensureDb();
            const normalizedUsername = this.normalizeUsername(username);
            const platformPrefix = targetPlatform === 'kick' ? 'k' : 'y';
            const user = await db.findOneAsync({
                username: normalizedUsername,
                _id: { $regex: new RegExp(`^${platformPrefix}`) }
            });
            return user ? this.ensureUserRoles(user) : null;
        } catch (error) {
            this.logger.debug(`Failed to get user by username: ${error}`);
            return null;
        }
    }

    /**
     * Get an existing user or create a new one.
     * @param platform Platform identifier.
     * @param userId Platform-prefixed user ID.
     * @param username Username for the user record.
     * @param displayName Optional display name.
     * @param profilePicUrl Optional profile image URL.
     * @returns The existing or newly created user.
     */
    async getOrCreateUser(
        platform: string,
        userId: string,
        username: string,
        displayName?: string,
        profilePicUrl?: string
    ): Promise<PlatformUser> {
        this.validatePlatform(platform);
        const db = this.ensureDb();
        const normalizedUserId = this.validateUserId(userId);
        const normalizedUsername = this.normalizeUsername(username);

        const existingUser = await db.findOneAsync({ _id: normalizedUserId });
        if (existingUser) {
            return this.ensureUserRoles(existingUser);
        }

        const newUser: PlatformUser = {
            _id: normalizedUserId,
            username: normalizedUsername,
            displayName: displayName || normalizedUsername,
            profilePicUrl: profilePicUrl || '',
            lastSeen: Date.now(),
            currency: {},
            metadata: {},
            chatMessages: 0,
            minutesInChannel: 0,
            twitchRoles: []
        };

        return await db.insertAsync(newUser);
    }

    /**
     * Get a user's currency amount.
     * @param platform Platform identifier.
     * @param userId Platform-prefixed user ID.
     * @param currencyId Currency identifier.
     * @returns Amount or 0 when missing or invalid.
     */
    async getUserCurrency(platform: string, userId: string, currencyId: string): Promise<number> {
        try {
            this.validatePlatform(platform);
            const db = this.ensureDb();
            const normalizedUserId = this.validateUserId(userId);
            const user = await db.findOneAsync({ _id: normalizedUserId });
            const amount = user?.currency?.[currencyId];
            return typeof amount === 'number' && !isNaN(amount) ? amount : 0;
        } catch (error) {
            this.logger.debug(`Failed to get user currency: ${error}`);
            return 0;
        }
    }

    /**
     * Set a user's currency amount.
     * @param platform Platform identifier.
     * @param userId Platform-prefixed user ID.
     * @param currencyId Currency identifier.
     * @param amount Amount to set.
     */
    async setUserCurrency(platform: string, userId: string, currencyId: string, amount: number): Promise<void> {
        try {
            this.validatePlatform(platform);
            const db = this.ensureDb();
            const normalizedUserId = this.validateUserId(userId);
            await db.updateAsync(
                { _id: normalizedUserId },
                { $set: { [`currency.${currencyId}`]: amount } }
            );
        } catch (error) {
            this.logger.debug(`Failed to set user currency: ${error}`);
        }
    }

    /**
     * Adjust a user's currency amount.
     * @param platform Platform identifier.
     * @param userId Platform-prefixed user ID.
     * @param currencyId Currency identifier.
     * @param amount Delta to apply before clamping.
     */
    async adjustUserCurrency(platform: string, userId: string, currencyId: string, amount: number): Promise<void> {
        try {
            this.validatePlatform(platform);
            const current = await this.getUserCurrency(platform, userId, currencyId);
            const nextAmount = current + amount;
            const clampedAmount = this.clampCurrency(nextAmount, currencyId);
            await this.setUserCurrency(platform, userId, currencyId, clampedAmount);
        } catch (error) {
            this.logger.debug(`Failed to adjust user currency: ${error}`);
        }
    }

    /**
     * Adjust currency for all users on a platform.
     * @param platform Platform identifier.
     * @param currencyId Currency identifier.
     * @param amount Amount to set or adjust.
     * @param adjustType Use "set" to override or "adjust" to increment.
     * @throws Error when the database is not initialized.
     */
    async adjustCurrencyForAllUsers(
        platform: string,
        currencyId: string,
        amount: number,
        adjustType: 'adjust' | 'set'
    ): Promise<void> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        this.validatePlatform(platform);

        const platformPrefix = platform === 'kick' ? 'k' : 'y';
        const filter = { _id: { $regex: new RegExp(`^${platformPrefix}`) } };

        if (adjustType === 'set') {
            const clampedAmount = this.clampCurrency(amount, currencyId);
            await this.db.updateAsync(
                filter,
                { $set: { [`currency.${currencyId}`]: clampedAmount } },
                { multi: true }
            );
        } else {
            await this.db.updateAsync(
                filter,
                { $inc: { [`currency.${currencyId}`]: amount } },
                { multi: true }
            );

            await this.db.updateAsync(
                { ...filter, [`currency.${currencyId}`]: { $lt: 0 } },
                { $set: { [`currency.${currencyId}`]: 0 } },
                { multi: true }
            );
        }
    }

    /**
     * Get a metadata value for a user.
     * @param platform Platform identifier.
     * @param userId Platform-prefixed user ID.
     * @param key Metadata key.
     * @returns Value or undefined when missing or invalid.
     */
    async getUserMetadata(platform: string, userId: string, key: string): Promise<unknown> {
        try {
            this.validatePlatform(platform);
            const user = await this.getUser(platform, userId);
            return user?.metadata?.[key];
        } catch (error) {
            this.logger.debug(`Failed to get user metadata: ${error}`);
            return undefined;
        }
    }

    /**
     * Set a metadata value for a user.
     * @param platform Platform identifier.
     * @param userId Platform-prefixed user ID.
     * @param key Metadata key.
     * @param value Metadata value.
     */
    async setUserMetadata(platform: string, userId: string, key: string, value: unknown): Promise<void> {
        await this.updateUserField(platform, userId, `metadata.${key}`, value);
    }

    /**
     * Increment a numeric metadata value for a user.
     * @param platform Platform identifier.
     * @param userId Platform-prefixed user ID.
     * @param key Metadata key.
     * @param amount Delta to apply (can be negative).
     * @returns New value after increment.
     */
    async incrementUserMetadata(platform: string, userId: string, key: string, amount: number): Promise<number> {
        try {
            this.validatePlatform(platform);

            // Get current value (treat non-numeric as 0)
            const currentValue = await this.getUserMetadata(platform, userId, key);
            const numericValue = typeof currentValue === 'number' ? currentValue : 0;

            // Calculate new value
            const newValue = numericValue + amount;

            // Set new value
            await this.setUserMetadata(platform, userId, key, newValue);

            return newValue;
        } catch (error) {
            this.logger.debug(`Failed to increment user metadata: ${error}`);
            throw error;
        }
    }

    /**
     * Update a single field for a user.
     * @param platform Platform identifier.
     * @param userId Platform-prefixed user ID.
     * @param field Field path to update.
     * @param value Value to set.
     */
    async updateUserField(platform: string, userId: string, field: string, value: unknown): Promise<void> {
        try {
            this.validatePlatform(platform);
            const db = this.ensureDb();
            const normalizedUserId = this.validateUserId(userId);
            await db.updateAsync(
                { _id: normalizedUserId },
                { $set: { [field]: value } }
            );
        } catch (error) {
            this.logger.debug(`Failed to update user field: ${error}`);
        }
    }

    /**
     * Update lastSeen for a user to the current time.
     * @param platform Platform identifier.
     * @param userId Platform-prefixed user ID.
     */
    async updateLastSeen(platform: string, userId: string): Promise<void> {
        await this.updateUserField(platform, userId, 'lastSeen', Date.now());
    }

    /**
     * Get a user's chat message count.
     * @param platform Platform identifier.
     * @param userId Platform-prefixed user ID.
     * @returns Count or 0 when missing or invalid.
     */
    async getChatMessages(platform: string, userId: string): Promise<number> {
        try {
            this.validatePlatform(platform);
            const db = this.ensureDb();
            const normalizedUserId = this.validateUserId(userId);
            const user = await db.findOneAsync({ _id: normalizedUserId });
            const count = user?.chatMessages;
            return typeof count === 'number' && !isNaN(count) ? count : 0;
        } catch (error) {
            this.logger.debug(`Failed to get chat messages: ${error}`);
            return 0;
        }
    }

    /**
     * Set a user's chat message count.
     * @param platform Platform identifier.
     * @param userId Platform-prefixed user ID.
     * @param count Count to set (clamped to non-negative).
     */
    async setChatMessages(platform: string, userId: string, count: number): Promise<void> {
        try {
            this.validatePlatform(platform);
            const db = this.ensureDb();
            const normalizedUserId = this.validateUserId(userId);
            const clampedCount = Math.max(0, count);
            await db.updateAsync(
                { _id: normalizedUserId },
                { $set: { chatMessages: clampedCount } }
            );
        } catch (error) {
            this.logger.debug(`Failed to set chat messages: ${error}`);
        }
    }

    /**
     * Get a user's viewer roles.
     * @param platform Platform identifier.
     * @param userId Platform-prefixed user ID.
     * @returns Roles array, defaults to empty.
     */
    async getUserRoles(platform: string, userId: string): Promise<string[]> {
        try {
            this.validatePlatform(platform);
            const user = await this.getUser(platform, userId);
            return Array.isArray(user?.twitchRoles) ? user.twitchRoles : [];
        } catch (error) {
            this.logger.debug(`Failed to get user roles: ${error}`);
            return [];
        }
    }

    /**
     * Set a user's viewer roles.
     * @param platform Platform identifier.
     * @param userId Platform-prefixed user ID.
     * @param roles Roles to store.
     */
    async setUserRoles(platform: string, userId: string, roles: string[]): Promise<void> {
        try {
            this.validatePlatform(platform);
            const db = this.ensureDb();
            const normalizedUserId = this.validateUserId(userId);
            const normalizedRoles = Array.isArray(roles)
                ? roles.filter(role => typeof role === 'string')
                : [];
            await db.updateAsync(
                { _id: normalizedUserId },
                { $set: { twitchRoles: normalizedRoles } }
            );
        } catch (error) {
            this.logger.debug(`Failed to set user roles: ${error}`);
        }
    }

    /**
     * Increment a user's chat message count.
     * @param platform Platform identifier.
     * @param userId Platform-prefixed user ID.
     * @param amount Delta to apply (can be negative, result clamped to non-negative).
     * @returns New count after increment.
     */
    async incrementChatMessages(platform: string, userId: string, amount: number): Promise<number> {
        try {
            this.validatePlatform(platform);
            const current = await this.getChatMessages(platform, userId);
            const newCount = Math.max(0, current + amount);
            await this.setChatMessages(platform, userId, newCount);
            return newCount;
        } catch (error) {
            this.logger.debug(`Failed to increment chat messages: ${error}`);
            throw error;
        }
    }

    /**
     * Get a user's minutes in channel.
     * @param platform Platform identifier.
     * @param userId Platform-prefixed user ID.
     * @returns Minutes or 0 when missing or invalid.
     */
    async getMinutesInChannel(platform: string, userId: string): Promise<number> {
        try {
            this.validatePlatform(platform);
            const db = this.ensureDb();
            const normalizedUserId = this.validateUserId(userId);
            const user = await db.findOneAsync({ _id: normalizedUserId });
            const minutes = user?.minutesInChannel;
            return typeof minutes === 'number' && !isNaN(minutes) ? minutes : 0;
        } catch (error) {
            this.logger.debug(`Failed to get minutes in channel: ${error}`);
            return 0;
        }
    }

    /**
     * Set a user's minutes in channel.
     * @param platform Platform identifier.
     * @param userId Platform-prefixed user ID.
     * @param minutes Minutes to set (clamped to non-negative).
     */
    async setMinutesInChannel(platform: string, userId: string, minutes: number): Promise<void> {
        try {
            this.validatePlatform(platform);
            const db = this.ensureDb();
            const normalizedUserId = this.validateUserId(userId);
            const clampedMinutes = Math.max(0, minutes);
            await db.updateAsync(
                { _id: normalizedUserId },
                { $set: { minutesInChannel: clampedMinutes } }
            );
        } catch (error) {
            this.logger.debug(`Failed to set minutes in channel: ${error}`);
        }
    }

    /**
     * Increment a user's minutes in channel.
     * @param platform Platform identifier.
     * @param userId Platform-prefixed user ID.
     * @param amount Delta to apply (can be negative, result clamped to non-negative).
     * @returns New minutes after increment.
     */
    async incrementMinutesInChannel(platform: string, userId: string, amount: number): Promise<number> {
        try {
            this.validatePlatform(platform);
            const current = await this.getMinutesInChannel(platform, userId);
            const newMinutes = Math.max(0, current + amount);
            await this.setMinutesInChannel(platform, userId, newMinutes);
            return newMinutes;
        } catch (error) {
            this.logger.debug(`Failed to increment minutes in channel: ${error}`);
            throw error;
        }
    }

    async migrateFromKickDb(kickDbPath: string): Promise<MigrationResult> {
        const db = this.ensureDb();
        const result: MigrationResult = {
            migrated: 0,
            skipped: 0,
            conflicts: []
        };

        const kickDb = new Datastore<KickUserRecord>({
            filename: kickDbPath,
            autoload: false
        });

        await kickDb.loadDatabaseAsync();
        const kickUsers = await kickDb.findAsync({});

        for (const kickUser of kickUsers) {
            try {
                const rawId = typeof kickUser._id === 'string' ? kickUser._id : '';
                const rawUsername = typeof kickUser.username === 'string' ? kickUser.username : '';

                if (!rawId || !rawUsername) {
                    this.logger.warn(`Skipping Kick user with missing id or username: ${JSON.stringify(kickUser)}`);
                    result.skipped += 1;
                    continue;
                }

                const prefixedId = this.ensurePlatformPrefixForMigration('kick', rawId);
                const normalizedUsername = this.normalizeUsername(rawUsername);

                const existingById = await db.findOneAsync({ _id: prefixedId });
                if (existingById) {
                    result.conflicts.push({
                        type: 'id',
                        kickUserId: rawId,
                        kickUsername: rawUsername,
                        existingUserId: existingById._id,
                        reason: `User id already exists: ${prefixedId}`
                    });
                    this.logger.warn(`Kick migration conflict (id): ${prefixedId}`);
                    result.skipped += 1;
                    continue;
                }

                const existingByUsername = await db.findOneAsync({
                    username: normalizedUsername,
                    _id: { $regex: /^k/ }
                });
                if (existingByUsername) {
                    result.conflicts.push({
                        type: 'username',
                        kickUserId: rawId,
                        kickUsername: rawUsername,
                        existingUserId: existingByUsername._id,
                        reason: `Username already exists for Kick: ${normalizedUsername}`
                    });
                    this.logger.warn(`Kick migration conflict (username): ${normalizedUsername}`);
                    result.skipped += 1;
                    continue;
                }

                const migratedUser: PlatformUser = {
                    _id: prefixedId,
                    username: normalizedUsername,
                    displayName: typeof kickUser.displayName === 'string' && kickUser.displayName.trim()
                        ? kickUser.displayName
                        : normalizedUsername,
                    profilePicUrl: typeof kickUser.profilePicUrl === 'string' ? kickUser.profilePicUrl : '',
                    lastSeen: typeof kickUser.lastSeen === 'number' ? kickUser.lastSeen : 0,
                    currency: typeof kickUser.currency === 'object' && kickUser.currency ? kickUser.currency : {},
                    metadata: typeof kickUser.metadata === 'object' && kickUser.metadata ? kickUser.metadata : {},
                    chatMessages: typeof kickUser.chatMessages === 'number' ? kickUser.chatMessages : 0,
                    minutesInChannel: typeof kickUser.minutesInChannel === 'number' ? kickUser.minutesInChannel : 0,
                    twitchRoles: Array.isArray(kickUser.twitchRoles) ? kickUser.twitchRoles : []
                };

                await db.insertAsync(migratedUser);
                result.migrated += 1;
            } catch (error) {
                this.logger.warn(`Failed to migrate Kick user: ${error}`);
                result.skipped += 1;
            }
        }

        return result;
    }

    private ensureUserRoles(user: PlatformUser): PlatformUser {
        if (!Array.isArray(user.twitchRoles)) {
            user.twitchRoles = [];
        }
        return user;
    }

    private ensureDb(): Datastore<PlatformUser> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }
        return this.db;
    }
}
