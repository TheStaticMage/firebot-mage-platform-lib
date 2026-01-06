/* eslint-disable @typescript-eslint/unbound-method */
import Datastore from '@seald-io/nedb';
import fs from 'fs';
import { PlatformUserDatabase } from '../platform-user-database';
import { firebot } from '../../main';
import type { LogWrapper } from '../../main';

jest.mock('@seald-io/nedb');
jest.mock('fs', () => ({ promises: { rename: jest.fn() } }));
jest.mock('../../main', () => ({
    firebot: {
        modules: {
            currencyAccess: {
                getCurrencyById: jest.fn()
            }
        }
    },
    LogWrapper: function LogWrapper() {
        return undefined;
    }
}));

const mockDatastore = Datastore as unknown as jest.MockedClass<typeof Datastore>;
const mockRename = fs.promises.rename as jest.Mock;

const createMockDb = () => ({
    loadDatabaseAsync: jest.fn(),
    setAutocompactionInterval: jest.fn(),
    insertAsync: jest.fn(),
    findOneAsync: jest.fn(),
    findAsync: jest.fn(),
    updateAsync: jest.fn()
});

describe('PlatformUserDatabase', () => {
    const logger = {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn()
    } as unknown as LogWrapper;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('initializes database successfully', async () => {
        const mockDb = createMockDb();
        mockDb.loadDatabaseAsync.mockResolvedValue(undefined);
        mockDatastore.mockImplementation(() => mockDb as any);

        const db = new PlatformUserDatabase('data', logger);
        await db.initialize();

        expect(mockDb.loadDatabaseAsync).toHaveBeenCalledTimes(1);
        expect(mockDb.setAutocompactionInterval).toHaveBeenCalledWith(30000);
    });

    it('recovers when database load fails', async () => {
        const failingDb = createMockDb();
        failingDb.loadDatabaseAsync.mockRejectedValue(new Error('load failed'));
        const recoveryDb = createMockDb();
        recoveryDb.loadDatabaseAsync.mockResolvedValue(undefined);

        mockDatastore
            .mockImplementationOnce(() => failingDb as any)
            .mockImplementationOnce(() => recoveryDb as any);
        mockRename.mockResolvedValue(undefined);

        const db = new PlatformUserDatabase('data', logger);
        await db.initialize();

        expect(mockDatastore).toHaveBeenCalledTimes(2);
        expect(mockRename).toHaveBeenCalledTimes(1);
    });

    it('validates platform values', () => {
        const db = new PlatformUserDatabase('data', logger);

        expect(() => (db as any).validatePlatform('twitch')).toThrow();
        expect(() => (db as any).validatePlatform('kick')).not.toThrow();
        expect(() => (db as any).validatePlatform('youtube')).not.toThrow();
    });

    it('validates user ID formats', () => {
        const db = new PlatformUserDatabase('data', logger);

        expect((db as any).validateUserId('k123')).toBe('k123');
        expect((db as any).validateUserId('yUCabc123')).toBe('yUCabc123');
        expect(() => (db as any).validateUserId('123')).toThrow();
        expect(() => (db as any).validateUserId('kabc')).toThrow();
        expect(() => (db as any).validateUserId('y123')).toThrow();
    });

    it('normalizes usernames', () => {
        const db = new PlatformUserDatabase('data', logger);

        expect(db.normalizeUsername('User@Kick')).toBe('user');
        expect(db.normalizeUsername('@User@YouTube')).toBe('user');
        expect(db.normalizeUsername('User')).toBe('user');
    });

    it('throws when username normalizes to empty', () => {
        const db = new PlatformUserDatabase('data', logger);

        expect(() => db.normalizeUsername('@kick')).toThrow();
    });

    it('creates a user with defaults', async () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));

        const mockDb = createMockDb();
        mockDb.findOneAsync.mockResolvedValue(null);
        mockDb.insertAsync.mockImplementation(async user => user);
        const db = new PlatformUserDatabase('data', logger);
        (db as any).db = mockDb;

        const created = await db.getOrCreateUser('kick', 'k123', 'TestUser');

        expect(created.username).toBe('testuser');
        expect(created.displayName).toBe('testuser');
        expect(created.lastSeen).toBe(Date.now());
        expect(created.chatMessages).toBe(0);
        expect(created.minutesInChannel).toBe(0);
        expect(created.twitchRoles).toEqual([]);
        expect(mockDb.insertAsync).toHaveBeenCalledTimes(1);

        jest.useRealTimers();
    });

    it('returns existing user when found', async () => {
        const mockDb = createMockDb();
        const existing = {
            _id: 'k123',
            username: 'user',
            displayName: 'user',
            profilePicUrl: '',
            lastSeen: 0,
            currency: {},
            metadata: {},
            twitchRoles: []
        };
        mockDb.findOneAsync.mockResolvedValue(existing);
        const db = new PlatformUserDatabase('data', logger);
        (db as any).db = mockDb;

        const user = await db.getOrCreateUser('kick', 'k123', 'User');

        expect(user).toBe(existing);
        expect(mockDb.insertAsync).not.toHaveBeenCalled();
    });

    it('infers platform from username suffix in getUserByUsername', async () => {
        const mockDb = createMockDb();
        mockDb.findOneAsync.mockResolvedValue(null);
        const db = new PlatformUserDatabase('data', logger);
        (db as any).db = mockDb;

        await db.getUserByUsername('Example@Kick');

        expect(mockDb.findOneAsync).toHaveBeenCalledWith({
            username: 'example',
            _id: { $regex: expect.any(RegExp) }
        });
    });

    it('adjusts currency for all users', async () => {
        const mockDb = createMockDb();
        mockDb.updateAsync.mockResolvedValue(1);
        const db = new PlatformUserDatabase('data', logger);
        (db as any).db = mockDb;
        ((firebot.modules as any).currencyAccess.getCurrencyById as jest.Mock).mockReturnValue({ limit: 0 });

        await db.adjustCurrencyForAllUsers('kick', 'points', 10, 'set');

        expect(mockDb.updateAsync).toHaveBeenCalledWith(
            { _id: { $regex: expect.any(RegExp) } },
            { $set: { 'currency.points': 10 } },
            { multi: true }
        );
    });

    it('returns zero when currency is missing', async () => {
        const mockDb = createMockDb();
        mockDb.findOneAsync.mockResolvedValue({ _id: 'k123', username: 'user', displayName: 'user', profilePicUrl: '', lastSeen: 0, currency: {}, metadata: {} });
        const db = new PlatformUserDatabase('data', logger);
        (db as any).db = mockDb;

        const amount = await db.getUserCurrency('kick', 'k123', 'points');

        expect(amount).toBe(0);
    });

    it('clamps currency to limit and non-negative', () => {
        const db = new PlatformUserDatabase('data', logger);
        ((firebot.modules as any).currencyAccess.getCurrencyById as jest.Mock).mockReturnValue({ limit: 5 });

        expect(db.clampCurrency(10, 'points')).toBe(5);
        expect(db.clampCurrency(-3, 'points')).toBe(0);
    });

    it('clamps currency when currency is missing', () => {
        const db = new PlatformUserDatabase('data', logger);
        ((firebot.modules as any).currencyAccess.getCurrencyById as jest.Mock).mockReturnValue(null);

        expect(db.clampCurrency(10, 'points')).toBe(10);
        expect(db.clampCurrency(-3, 'points')).toBe(0);
    });

    it('handles NaN and Infinity in clampCurrency', () => {
        const db = new PlatformUserDatabase('data', logger);
        ((firebot.modules as any).currencyAccess.getCurrencyById as jest.Mock).mockReturnValue({ limit: 5 });

        expect(db.clampCurrency(Infinity, 'points')).toBe(5);
        expect(Number.isNaN(db.clampCurrency(NaN, 'points'))).toBe(true);
    });

    it('adjusts currency for all users with adjust and clamps negatives', async () => {
        const mockDb = createMockDb();
        mockDb.updateAsync.mockResolvedValue(1);
        const db = new PlatformUserDatabase('data', logger);
        (db as any).db = mockDb;

        await db.adjustCurrencyForAllUsers('youtube', 'points', -5, 'adjust');

        expect(mockDb.updateAsync).toHaveBeenCalledWith(
            { _id: { $regex: expect.any(RegExp) } },
            { $inc: { 'currency.points': -5 } },
            { multi: true }
        );
        expect(mockDb.updateAsync).toHaveBeenCalledWith(
            { _id: { $regex: expect.any(RegExp) }, 'currency.points': { $lt: 0 } },
            { $set: { 'currency.points': 0 } },
            { multi: true }
        );
    });

    it('gets and sets metadata fields', async () => {
        const mockDb = createMockDb();
        mockDb.findOneAsync.mockResolvedValue({
            _id: 'k123',
            username: 'user',
            displayName: 'user',
            profilePicUrl: '',
            lastSeen: 0,
            currency: {},
            metadata: { foo: 'bar' }
        });
        mockDb.updateAsync.mockResolvedValue(1);
        const db = new PlatformUserDatabase('data', logger);
        (db as any).db = mockDb;

        const value = await db.getUserMetadata('kick', 'k123', 'foo');
        expect(value).toBe('bar');

        await db.setUserMetadata('kick', 'k123', 'foo', 'baz');
        expect(mockDb.updateAsync).toHaveBeenCalledWith(
            { _id: 'k123' },
            { $set: { 'metadata.foo': 'baz' } }
        );
    });

    it('parses JSON metadata payloads', async () => {
        const mockDb = createMockDb();
        mockDb.findOneAsync.mockResolvedValue({
            _id: 'k123',
            username: 'user',
            displayName: 'user',
            profilePicUrl: '',
            lastSeen: 0,
            currency: {},
            metadata: {}
        });
        mockDb.updateAsync.mockResolvedValue(1);
        const db = new PlatformUserDatabase('data', logger);
        (db as any).db = mockDb;

        await db.setUserMetadata('kick', 'k123', 'foo', '{"bar":1}');

        expect(mockDb.updateAsync).toHaveBeenCalledWith(
            { _id: 'k123' },
            { $set: { 'metadata.foo': { bar: 1 } } }
        );
    });

    it('updates metadata when a property path is provided', async () => {
        const mockDb = createMockDb();
        mockDb.findOneAsync.mockResolvedValue({
            _id: 'k123',
            username: 'user',
            displayName: 'user',
            profilePicUrl: '',
            lastSeen: 0,
            currency: {},
            metadata: { foo: { nested: { value: 'old' }, list: [1, 2] } }
        });
        mockDb.updateAsync.mockResolvedValue(1);
        const db = new PlatformUserDatabase('data', logger);
        (db as any).db = mockDb;

        await db.setUserMetadata('kick', 'k123', 'foo', '"new"', 'nested.value');

        expect(mockDb.updateAsync).toHaveBeenCalledWith(
            { _id: 'k123' },
            { $set: { 'metadata.foo': { nested: { value: 'new' }, list: [1, 2] } } }
        );
    });

    it('skips updates when property path is set but data is missing', async () => {
        const mockDb = createMockDb();
        mockDb.findOneAsync.mockResolvedValue({
            _id: 'k123',
            username: 'user',
            displayName: 'user',
            profilePicUrl: '',
            lastSeen: 0,
            currency: {},
            metadata: {}
        });
        mockDb.updateAsync.mockResolvedValue(1);
        const db = new PlatformUserDatabase('data', logger);
        (db as any).db = mockDb;

        await db.setUserMetadata('kick', 'k123', 'foo', '"new"', 'nested.value');

        expect(mockDb.updateAsync).not.toHaveBeenCalled();
    });

    it('updates lastSeen field', async () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));

        const mockDb = createMockDb();
        mockDb.updateAsync.mockResolvedValue(1);
        const db = new PlatformUserDatabase('data', logger);
        (db as any).db = mockDb;

        await db.updateLastSeen('kick', 'k123');

        expect(mockDb.updateAsync).toHaveBeenCalledWith(
            { _id: 'k123' },
            { $set: { lastSeen: Date.now() } }
        );

        jest.useRealTimers();
    });

    it('handles concurrent updates without errors', async () => {
        const mockDb = createMockDb();
        mockDb.updateAsync.mockResolvedValue(1);
        const db = new PlatformUserDatabase('data', logger);
        (db as any).db = mockDb;

        await Promise.all([
            db.setUserCurrency('kick', 'k123', 'points', 10),
            db.updateUserField('kick', 'k123', 'metadata.test', true)
        ]);

        expect(mockDb.updateAsync).toHaveBeenCalledTimes(2);
    });

    it('increments numeric metadata by positive amount', async () => {
        const mockDb = createMockDb();
        mockDb.findOneAsync.mockResolvedValue({
            _id: 'k123',
            username: 'user',
            displayName: 'user',
            profilePicUrl: '',
            lastSeen: 0,
            currency: {},
            metadata: { customValue: 5 },
            chatMessages: 0,
            minutesInChannel: 0
        });
        mockDb.updateAsync.mockResolvedValue(1);
        const db = new PlatformUserDatabase('data', logger);
        (db as any).db = mockDb;

        const newValue = await db.incrementUserMetadata('kick', 'k123', 'customValue', 3);

        expect(newValue).toBe(8);
        expect(mockDb.updateAsync).toHaveBeenCalledWith(
            { _id: 'k123' },
            { $set: { 'metadata.customValue': 8 } }
        );
    });

    it('increments numeric metadata by negative amount', async () => {
        const mockDb = createMockDb();
        mockDb.findOneAsync.mockResolvedValue({
            _id: 'k123',
            username: 'user',
            displayName: 'user',
            profilePicUrl: '',
            lastSeen: 0,
            currency: {},
            metadata: { customValue: 5 },
            chatMessages: 0,
            minutesInChannel: 0
        });
        mockDb.updateAsync.mockResolvedValue(1);
        const db = new PlatformUserDatabase('data', logger);
        (db as any).db = mockDb;

        const newValue = await db.incrementUserMetadata('kick', 'k123', 'customValue', -2);

        expect(newValue).toBe(3);
        expect(mockDb.updateAsync).toHaveBeenCalledWith(
            { _id: 'k123' },
            { $set: { 'metadata.customValue': 3 } }
        );
    });

    it('treats missing metadata key as 0', async () => {
        const mockDb = createMockDb();
        mockDb.findOneAsync.mockResolvedValue({
            _id: 'k123',
            username: 'user',
            displayName: 'user',
            profilePicUrl: '',
            lastSeen: 0,
            currency: {},
            metadata: {}
        });
        mockDb.updateAsync.mockResolvedValue(1);
        const db = new PlatformUserDatabase('data', logger);
        (db as any).db = mockDb;

        const newValue = await db.incrementUserMetadata('kick', 'k123', 'newKey', 5);

        expect(newValue).toBe(5);
    });

    it('treats non-numeric metadata value as 0', async () => {
        const mockDb = createMockDb();
        mockDb.findOneAsync.mockResolvedValue({
            _id: 'k123',
            username: 'user',
            displayName: 'user',
            profilePicUrl: '',
            lastSeen: 0,
            currency: {},
            metadata: { customValue: 'string' },
            chatMessages: 0,
            minutesInChannel: 0
        });
        mockDb.updateAsync.mockResolvedValue(1);
        const db = new PlatformUserDatabase('data', logger);
        (db as any).db = mockDb;

        const newValue = await db.incrementUserMetadata('kick', 'k123', 'customValue', 10);

        expect(newValue).toBe(10);
    });

    it('logs warning for invalid platform in increment', async () => {
        const mockDb = createMockDb();
        const db = new PlatformUserDatabase('data', logger);
        (db as any).db = mockDb;

        const result = await db.incrementUserMetadata('twitch', 'k123', 'test', 1);
        expect(result).toBe(0);
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to increment user metadata'));
    });

    describe('user roles operations', () => {
        it('gets user roles when present', async () => {
            const mockDb = createMockDb();
            mockDb.findOneAsync.mockResolvedValue({
                _id: 'k123',
                username: 'user',
                displayName: 'user',
                profilePicUrl: '',
                lastSeen: 0,
                currency: {},
                metadata: {},
                chatMessages: 0,
                minutesInChannel: 0,
                twitchRoles: ['mod']
            });
            const db = new PlatformUserDatabase('data', logger);
            (db as any).db = mockDb;

            const roles = await db.getUserRoles('kick', 'k123');
            expect(roles).toEqual(['mod']);
        });

        it('returns empty roles when missing', async () => {
            const mockDb = createMockDb();
            mockDb.findOneAsync.mockResolvedValue({
                _id: 'k123',
                username: 'user',
                displayName: 'user',
                profilePicUrl: '',
                lastSeen: 0,
                currency: {},
                metadata: {},
                chatMessages: 0,
                minutesInChannel: 0
            });
            const db = new PlatformUserDatabase('data', logger);
            (db as any).db = mockDb;

            const roles = await db.getUserRoles('kick', 'k123');
            expect(roles).toEqual([]);
        });

        it('sets user roles', async () => {
            const mockDb = createMockDb();
            mockDb.updateAsync.mockResolvedValue(1);
            const db = new PlatformUserDatabase('data', logger);
            (db as any).db = mockDb;

            await db.setUserRoles('kick', 'k123', ['mod', 'vip']);

            expect(mockDb.updateAsync).toHaveBeenCalledWith(
                { _id: 'k123' },
                { $set: { twitchRoles: ['mod', 'vip'] } }
            );
        });
    });

    describe('chatMessages operations', () => {
        it('gets chat messages count', async () => {
            const mockDb = createMockDb();
            mockDb.findOneAsync.mockResolvedValue({
                _id: 'k123',
                username: 'user',
                displayName: 'user',
                profilePicUrl: '',
                lastSeen: 0,
                currency: {},
                metadata: {},
                chatMessages: 42,
                minutesInChannel: 0
            });
            const db = new PlatformUserDatabase('data', logger);
            (db as any).db = mockDb;

            const count = await db.getChatMessages('kick', 'k123');
            expect(count).toBe(42);
        });

        it('returns zero when chatMessages is missing', async () => {
            const mockDb = createMockDb();
            mockDb.findOneAsync.mockResolvedValue({
                _id: 'k123',
                username: 'user',
                displayName: 'user',
                profilePicUrl: '',
                lastSeen: 0,
                currency: {},
                metadata: {},
                minutesInChannel: 0
            });
            const db = new PlatformUserDatabase('data', logger);
            (db as any).db = mockDb;

            const count = await db.getChatMessages('kick', 'k123');
            expect(count).toBe(0);
        });

        it('sets chat messages count', async () => {
            const mockDb = createMockDb();
            mockDb.updateAsync.mockResolvedValue(1);
            const db = new PlatformUserDatabase('data', logger);
            (db as any).db = mockDb;

            await db.setChatMessages('kick', 'k123', 10);

            expect(mockDb.updateAsync).toHaveBeenCalledWith(
                { _id: 'k123' },
                { $set: { chatMessages: 10 } }
            );
        });

        it('clamps negative chat messages to zero', async () => {
            const mockDb = createMockDb();
            mockDb.updateAsync.mockResolvedValue(1);
            const db = new PlatformUserDatabase('data', logger);
            (db as any).db = mockDb;

            await db.setChatMessages('kick', 'k123', -5);

            expect(mockDb.updateAsync).toHaveBeenCalledWith(
                { _id: 'k123' },
                { $set: { chatMessages: 0 } }
            );
        });

        it('increments chat messages by positive amount', async () => {
            const mockDb = createMockDb();
            mockDb.findOneAsync.mockResolvedValue({
                _id: 'k123',
                username: 'user',
                displayName: 'user',
                profilePicUrl: '',
                lastSeen: 0,
                currency: {},
                metadata: {},
                chatMessages: 5,
                minutesInChannel: 0
            });
            mockDb.updateAsync.mockResolvedValue(1);
            const db = new PlatformUserDatabase('data', logger);
            (db as any).db = mockDb;

            const newValue = await db.incrementChatMessages('kick', 'k123', 3);

            expect(newValue).toBe(8);
            expect(mockDb.updateAsync).toHaveBeenCalledWith(
                { _id: 'k123' },
                { $set: { chatMessages: 8 } }
            );
        });

        it('increments chat messages by negative amount', async () => {
            const mockDb = createMockDb();
            mockDb.findOneAsync.mockResolvedValue({
                _id: 'k123',
                username: 'user',
                displayName: 'user',
                profilePicUrl: '',
                lastSeen: 0,
                currency: {},
                metadata: {},
                chatMessages: 5,
                minutesInChannel: 0
            });
            mockDb.updateAsync.mockResolvedValue(1);
            const db = new PlatformUserDatabase('data', logger);
            (db as any).db = mockDb;

            const newValue = await db.incrementChatMessages('kick', 'k123', -2);

            expect(newValue).toBe(3);
        });

        it('clamps negative result to zero when incrementing', async () => {
            const mockDb = createMockDb();
            mockDb.findOneAsync.mockResolvedValue({
                _id: 'k123',
                username: 'user',
                displayName: 'user',
                profilePicUrl: '',
                lastSeen: 0,
                currency: {},
                metadata: {},
                chatMessages: 5,
                minutesInChannel: 0
            });
            mockDb.updateAsync.mockResolvedValue(1);
            const db = new PlatformUserDatabase('data', logger);
            (db as any).db = mockDb;

            const newValue = await db.incrementChatMessages('kick', 'k123', -10);

            expect(newValue).toBe(0);
        });

        it('treats missing chatMessages as 0 when incrementing', async () => {
            const mockDb = createMockDb();
            mockDb.findOneAsync.mockResolvedValue({
                _id: 'k123',
                username: 'user',
                displayName: 'user',
                profilePicUrl: '',
                lastSeen: 0,
                currency: {},
                metadata: {},
                minutesInChannel: 0
            });
            mockDb.updateAsync.mockResolvedValue(1);
            const db = new PlatformUserDatabase('data', logger);
            (db as any).db = mockDb;

            const newValue = await db.incrementChatMessages('kick', 'k123', 5);

            expect(newValue).toBe(5);
        });
    });

    describe('minutesInChannel operations', () => {
        it('gets minutes in channel', async () => {
            const mockDb = createMockDb();
            mockDb.findOneAsync.mockResolvedValue({
                _id: 'k123',
                username: 'user',
                displayName: 'user',
                profilePicUrl: '',
                lastSeen: 0,
                currency: {},
                metadata: {},
                chatMessages: 0,
                minutesInChannel: 120
            });
            const db = new PlatformUserDatabase('data', logger);
            (db as any).db = mockDb;

            const minutes = await db.getMinutesInChannel('kick', 'k123');
            expect(minutes).toBe(120);
        });

        it('returns zero when minutesInChannel is missing', async () => {
            const mockDb = createMockDb();
            mockDb.findOneAsync.mockResolvedValue({
                _id: 'k123',
                username: 'user',
                displayName: 'user',
                profilePicUrl: '',
                lastSeen: 0,
                currency: {},
                metadata: {},
                chatMessages: 0
            });
            const db = new PlatformUserDatabase('data', logger);
            (db as any).db = mockDb;

            const minutes = await db.getMinutesInChannel('kick', 'k123');
            expect(minutes).toBe(0);
        });

        it('sets minutes in channel', async () => {
            const mockDb = createMockDb();
            mockDb.updateAsync.mockResolvedValue(1);
            const db = new PlatformUserDatabase('data', logger);
            (db as any).db = mockDb;

            await db.setMinutesInChannel('kick', 'k123', 60);

            expect(mockDb.updateAsync).toHaveBeenCalledWith(
                { _id: 'k123' },
                { $set: { minutesInChannel: 60 } }
            );
        });

        it('clamps negative minutes to zero', async () => {
            const mockDb = createMockDb();
            mockDb.updateAsync.mockResolvedValue(1);
            const db = new PlatformUserDatabase('data', logger);
            (db as any).db = mockDb;

            await db.setMinutesInChannel('kick', 'k123', -10);

            expect(mockDb.updateAsync).toHaveBeenCalledWith(
                { _id: 'k123' },
                { $set: { minutesInChannel: 0 } }
            );
        });

        it('increments minutes in channel', async () => {
            const mockDb = createMockDb();
            mockDb.findOneAsync.mockResolvedValue({
                _id: 'k123',
                username: 'user',
                displayName: 'user',
                profilePicUrl: '',
                lastSeen: 0,
                currency: {},
                metadata: {},
                chatMessages: 0,
                minutesInChannel: 100
            });
            mockDb.updateAsync.mockResolvedValue(1);
            const db = new PlatformUserDatabase('data', logger);
            (db as any).db = mockDb;

            const newValue = await db.incrementMinutesInChannel('kick', 'k123', 15);

            expect(newValue).toBe(115);
        });

        it('treats missing minutesInChannel as 0 when incrementing', async () => {
            const mockDb = createMockDb();
            mockDb.findOneAsync.mockResolvedValue({
                _id: 'k123',
                username: 'user',
                displayName: 'user',
                profilePicUrl: '',
                lastSeen: 0,
                currency: {},
                metadata: {},
                chatMessages: 0
            });
            mockDb.updateAsync.mockResolvedValue(1);
            const db = new PlatformUserDatabase('data', logger);
            (db as any).db = mockDb;

            const newValue = await db.incrementMinutesInChannel('kick', 'k123', 30);

            expect(newValue).toBe(30);
        });
    });

    describe('Kick migration', () => {
        it('migrates Kick users into platform database', async () => {
            const platformDb = createMockDb();
            platformDb.findOneAsync.mockResolvedValue(null);
            platformDb.insertAsync.mockImplementation(async user => user);

            const kickDb = createMockDb();
            kickDb.loadDatabaseAsync.mockResolvedValue(undefined);
            kickDb.findAsync.mockResolvedValue([
                {
                    _id: '123',
                    username: 'TestUser',
                    displayName: 'Test User',
                    profilePicUrl: 'pic.png',
                    lastSeen: 1000,
                    currency: { points: 5 },
                    metadata: { foo: 'bar' },
                    chatMessages: 2,
                    minutesInChannel: 10
                }
            ]);

            mockDatastore.mockImplementation(() => kickDb as any);

            const db = new PlatformUserDatabase('data', logger);
            (db as any).db = platformDb;

            const result = await db.migrateFromKickDb('kick-db');

            expect(result).toEqual({
                migrated: 1,
                skipped: 0,
                conflicts: []
            });
            expect(platformDb.insertAsync).toHaveBeenCalledWith({
                _id: 'k123',
                username: 'testuser',
                displayName: 'Test User',
                profilePicUrl: 'pic.png',
                lastSeen: 1000,
                currency: { points: 5 },
                metadata: { foo: 'bar' },
                chatMessages: 2,
                minutesInChannel: 10,
                twitchRoles: []
            });
        });

        it('skips Kick users with ID or username conflicts', async () => {
            const platformDb = createMockDb();
            platformDb.findOneAsync.mockImplementation(async (query) => {
                if ((query)._id === 'k1') {
                    return { _id: 'k1', username: 'existing' };
                }
                if ((query).username === 'user2' && (query)._id?.$regex) {
                    return { _id: 'k9', username: 'user2' };
                }
                return null;
            });
            platformDb.insertAsync.mockImplementation(async user => user);

            const kickDb = createMockDb();
            kickDb.loadDatabaseAsync.mockResolvedValue(undefined);
            kickDb.findAsync.mockResolvedValue([
                { _id: '1', username: 'User1' },
                { _id: '2', username: 'User2' },
                { _id: '3', username: 'User3' }
            ]);

            mockDatastore.mockImplementation(() => kickDb as any);

            const db = new PlatformUserDatabase('data', logger);
            (db as any).db = platformDb;

            const result = await db.migrateFromKickDb('kick-db');

            expect(result.migrated).toBe(1);
            expect(result.skipped).toBe(2);
            expect(result.conflicts).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    type: 'id',
                    kickUserId: '1',
                    kickUsername: 'User1',
                    existingUserId: 'k1'
                }),
                expect.objectContaining({
                    type: 'username',
                    kickUserId: '2',
                    kickUsername: 'User2',
                    existingUserId: 'k9'
                })
            ]));
            expect(platformDb.insertAsync).toHaveBeenCalledWith(
                expect.objectContaining({ _id: 'k3', username: 'user3' })
            );
        });
    });
});
