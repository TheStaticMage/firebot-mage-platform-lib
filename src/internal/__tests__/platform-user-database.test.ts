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
        expect(mockDb.insertAsync).toHaveBeenCalledTimes(1);

        jest.useRealTimers();
    });

    it('returns existing user when found', async () => {
        const mockDb = createMockDb();
        const existing = { _id: 'k123', username: 'user', displayName: 'user', profilePicUrl: '', lastSeen: 0, currency: {}, metadata: {} };
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
});
