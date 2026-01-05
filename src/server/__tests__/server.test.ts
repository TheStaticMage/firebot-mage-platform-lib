/* eslint-disable @typescript-eslint/unbound-method */
import { registerRoutes, unregisterRoutes } from '../server';
import { platformLib } from '../../main';
import type { LogWrapper } from '../../main';

jest.mock('../../main', () => ({
    platformLib: {
        userDatabase: {
            getUser: jest.fn(),
            getUserByUsername: jest.fn(),
            getOrCreateUser: jest.fn(),
            setUserMetadata: jest.fn(),
            incrementUserMetadata: jest.fn(),
            updateLastSeen: jest.fn(),
            setChatMessages: jest.fn(),
            incrementChatMessages: jest.fn(),
            setMinutesInChannel: jest.fn(),
            incrementMinutesInChannel: jest.fn()
        }
    }
}));

describe('REST Endpoints', () => {
    let mockHttpServer: any;
    let logger: LogWrapper;
    const routes: { route: string; method: string; handler: any }[] = [];
    const unregisters: { route: string; method: string }[] = [];

    beforeEach(() => {
        jest.clearAllMocks();
        routes.length = 0;
        unregisters.length = 0;

        logger = {
            debug: jest.fn(),
            error: jest.fn(),
            info: jest.fn(),
            warn: jest.fn()
        } as unknown as LogWrapper;

        mockHttpServer = {
            registerCustomRoute: jest.fn((prefix, route, method, handler) => {
                routes.push({ route, method, handler });
            }),
            unregisterCustomRoute: jest.fn((prefix, route, method) => {
                unregisters.push({ route, method });
            })
        };
    });

    describe('route registration', () => {
        it('registers all endpoints', () => {
            const modules = { httpServer: mockHttpServer } as any;
            registerRoutes(modules, logger);

            expect(mockHttpServer.registerCustomRoute).toHaveBeenCalledTimes(11);
            expect(routes.map(r => r.route)).toContain('ping');
            expect(routes.map(r => r.route)).toContain('users/by-id');
            expect(routes.map(r => r.route)).toContain('users/by-username');
            expect(routes.map(r => r.route)).toContain('users/get-or-create');
            expect(routes.map(r => r.route)).toContain('users/metadata/set');
            expect(routes.map(r => r.route)).toContain('users/metadata/increment');
            expect(routes.map(r => r.route)).toContain('users/update-last-seen');
            expect(routes.map(r => r.route)).toContain('users/chat-messages/set');
            expect(routes.map(r => r.route)).toContain('users/chat-messages/increment');
            expect(routes.map(r => r.route)).toContain('users/minutes-in-channel/set');
            expect(routes.map(r => r.route)).toContain('users/minutes-in-channel/increment');
        });

        it('unregisters all endpoints', () => {
            const modules = { httpServer: mockHttpServer } as any;
            registerRoutes(modules, logger);
            unregisterRoutes(modules, logger);

            expect(mockHttpServer.unregisterCustomRoute).toHaveBeenCalledTimes(11);
        });
    });

    describe('GET /users/by-id', () => {
        it('returns user when found', async () => {
            const modules = { httpServer: mockHttpServer } as any;
            registerRoutes(modules, logger);

            const route = routes.find(r => r.route === 'users/by-id');
            const handler = route?.handler;
            const mockUser = { _id: 'k123', username: 'user', displayName: 'user', profilePicUrl: '', lastSeen: 0, currency: {}, metadata: {} };
            (platformLib.userDatabase.getUser as jest.Mock).mockResolvedValue(mockUser);

            const req = { query: { platform: 'kick', userId: 'k123' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

            if (handler) {
                await handler(req, res);
            }

            expect(res.json).toHaveBeenCalledWith({ success: true, user: mockUser });
        });

        it('returns error when platform is missing', async () => {
            const modules = { httpServer: mockHttpServer } as any;
            registerRoutes(modules, logger);

            const route = routes.find(r => r.route === 'users/by-id');
            const handler = route?.handler;
            const req = { query: { userId: 'k123' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

            if (handler) {
                await handler(req, res);
            }

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: false, error: expect.any(String) })
            );
        });

        it('handles database errors', async () => {
            const modules = { httpServer: mockHttpServer } as any;
            registerRoutes(modules, logger);

            const route = routes.find(r => r.route === 'users/by-id');
            const handler = route?.handler;
            (platformLib.userDatabase.getUser as jest.Mock).mockRejectedValue(new Error('db error'));

            const req = { query: { platform: 'kick', userId: 'k123' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

            if (handler) {
                await handler(req, res);
            }

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: false })
            );
        });
    });

    describe('GET /users/by-username', () => {
        it('returns user when found', async () => {
            const modules = { httpServer: mockHttpServer } as any;
            registerRoutes(modules, logger);

            const route = routes.find(r => r.route === 'users/by-username');
            const handler = route?.handler;
            const mockUser = { _id: 'k123', username: 'user', displayName: 'user', profilePicUrl: '', lastSeen: 0, currency: {}, metadata: {} };
            (platformLib.userDatabase.getUserByUsername as jest.Mock).mockResolvedValue(mockUser);

            const req = { query: { username: 'user', platform: 'kick' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

            if (handler) {
                await handler(req, res);
            }

            expect(res.json).toHaveBeenCalledWith({ success: true, user: mockUser });
        });

        it('returns null when user not found', async () => {
            const modules = { httpServer: mockHttpServer } as any;
            registerRoutes(modules, logger);

            const route = routes.find(r => r.route === 'users/by-username');
            const handler = route?.handler;
            (platformLib.userDatabase.getUserByUsername as jest.Mock).mockResolvedValue(null);

            const req = { query: { username: 'user' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

            if (handler) {
                await handler(req, res);
            }

            expect(res.json).toHaveBeenCalledWith({ success: true, user: undefined });
        });
    });

    describe('POST /users/get-or-create', () => {
        it('creates and returns user', async () => {
            const modules = { httpServer: mockHttpServer } as any;
            registerRoutes(modules, logger);

            const route = routes.find(r => r.route === 'users/get-or-create');
            const handler = route?.handler;
            const mockUser = { _id: 'k123', username: 'user', displayName: 'User', profilePicUrl: 'pic.png', lastSeen: 0, currency: {}, metadata: {} };
            const getUserMock = platformLib.userDatabase.getUser as jest.Mock;
            const getOrCreateUserMock = platformLib.userDatabase.getOrCreateUser as jest.Mock;
            getUserMock.mockResolvedValue(null);
            getOrCreateUserMock.mockResolvedValue(mockUser);

            const req = {
                body: {
                    platform: 'kick',
                    userId: 'k123',
                    username: 'user',
                    displayName: 'User',
                    profilePicUrl: 'pic.png'
                }
            };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

            if (handler) {
                await handler(req, res);
            }

            expect(res.json).toHaveBeenCalledWith({ success: true, user: mockUser, created: true });
            expect(getUserMock).toHaveBeenCalledWith('kick', 'k123');
            expect(getOrCreateUserMock).toHaveBeenCalledWith(
                'kick',
                'k123',
                'user',
                'User',
                'pic.png'
            );
        });

        it('returns existing user when found', async () => {
            const modules = { httpServer: mockHttpServer } as any;
            registerRoutes(modules, logger);

            const route = routes.find(r => r.route === 'users/get-or-create');
            const handler = route?.handler;
            const mockUser = { _id: 'k123', username: 'user', displayName: 'User', profilePicUrl: 'pic.png', lastSeen: 0, currency: {}, metadata: {} };
            const getUserMock = platformLib.userDatabase.getUser as jest.Mock;
            const getOrCreateUserMock = platformLib.userDatabase.getOrCreateUser as jest.Mock;
            getUserMock.mockResolvedValue(mockUser);

            const req = {
                body: {
                    platform: 'kick',
                    userId: 'k123',
                    username: 'user'
                }
            };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

            if (handler) {
                await handler(req, res);
            }

            expect(res.json).toHaveBeenCalledWith({ success: true, user: mockUser, created: false });
            expect(getUserMock).toHaveBeenCalledWith('kick', 'k123');
            expect(getOrCreateUserMock).not.toHaveBeenCalled();
        });

        it('returns error when required fields missing', async () => {
            const modules = { httpServer: mockHttpServer } as any;
            registerRoutes(modules, logger);

            const route = routes.find(r => r.route === 'users/get-or-create');
            const handler = route?.handler;
            const req = { body: { platform: 'kick', userId: 'k123' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

            if (handler) {
                await handler(req, res);
            }

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('POST /users/metadata/set', () => {
        it('sets metadata successfully', async () => {
            const modules = { httpServer: mockHttpServer } as any;
            registerRoutes(modules, logger);

            const route = routes.find(r => r.route === 'users/metadata/set');
            const handler = route?.handler;
            const setUserMetadataMock = platformLib.userDatabase.setUserMetadata as jest.Mock;
            setUserMetadataMock.mockResolvedValue(undefined);

            const req = {
                body: {
                    platform: 'kick',
                    userId: 'k123',
                    key: 'chatMessages',
                    value: 42
                }
            };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

            if (handler) {
                await handler(req, res);
            }

            expect(res.json).toHaveBeenCalledWith({ success: true });
            expect(setUserMetadataMock).toHaveBeenCalledWith(
                'kick',
                'k123',
                'chatMessages',
                42
            );
        });

        it('returns error when key is missing', async () => {
            const modules = { httpServer: mockHttpServer } as any;
            registerRoutes(modules, logger);

            const route = routes.find(r => r.route === 'users/metadata/set');
            const handler = route?.handler;
            const req = { body: { platform: 'kick', userId: 'k123' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

            if (handler) {
                await handler(req, res);
            }

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('POST /users/metadata/increment', () => {
        it('increments metadata and returns new value', async () => {
            const modules = { httpServer: mockHttpServer } as any;
            registerRoutes(modules, logger);

            const route = routes.find(r => r.route === 'users/metadata/increment');
            const handler = route?.handler;
            const incrementUserMetadataMock = platformLib.userDatabase.incrementUserMetadata as jest.Mock;
            incrementUserMetadataMock.mockResolvedValue(10);

            const req = {
                body: {
                    platform: 'kick',
                    userId: 'k123',
                    key: 'chatMessages',
                    amount: 3
                }
            };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

            if (handler) {
                await handler(req, res);
            }

            expect(res.json).toHaveBeenCalledWith({ success: true, newValue: 10 });
            expect(incrementUserMetadataMock).toHaveBeenCalledWith(
                'kick',
                'k123',
                'chatMessages',
                3
            );
        });

        it('returns error when amount is undefined', async () => {
            const modules = { httpServer: mockHttpServer } as any;
            registerRoutes(modules, logger);

            const route = routes.find(r => r.route === 'users/metadata/increment');
            const handler = route?.handler;
            const req = { body: { platform: 'kick', userId: 'k123', key: 'test' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

            if (handler) {
                await handler(req, res);
            }

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('POST /users/update-last-seen', () => {
        it('updates last seen successfully', async () => {
            const modules = { httpServer: mockHttpServer } as any;
            registerRoutes(modules, logger);

            const route = routes.find(r => r.route === 'users/update-last-seen');
            const handler = route?.handler;
            const updateLastSeenMock = platformLib.userDatabase.updateLastSeen as jest.Mock;
            updateLastSeenMock.mockResolvedValue(undefined);

            const req = {
                body: {
                    platform: 'youtube',
                    userId: 'yUC123'
                }
            };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

            if (handler) {
                await handler(req, res);
            }

            expect(res.json).toHaveBeenCalledWith({ success: true });
            expect(updateLastSeenMock).toHaveBeenCalledWith(
                'youtube',
                'yUC123'
            );
        });

        it('returns error when userId is missing', async () => {
            const modules = { httpServer: mockHttpServer } as any;
            registerRoutes(modules, logger);

            const route = routes.find(r => r.route === 'users/update-last-seen');
            const handler = route?.handler;
            const req = { body: { platform: 'kick' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

            if (handler) {
                await handler(req, res);
            }

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('POST /users/chat-messages/set', () => {
        it('sets chat messages successfully', async () => {
            const modules = { httpServer: mockHttpServer } as any;
            registerRoutes(modules, logger);

            const route = routes.find(r => r.route === 'users/chat-messages/set');
            const handler = route?.handler;
            const setChatMessagesMock = platformLib.userDatabase.setChatMessages as jest.Mock;
            setChatMessagesMock.mockResolvedValue(undefined);

            const req = {
                body: {
                    platform: 'kick',
                    userId: 'k123',
                    count: 42
                }
            };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

            if (handler) {
                await handler(req, res);
            }

            expect(res.json).toHaveBeenCalledWith({ success: true });
            expect(setChatMessagesMock).toHaveBeenCalledWith('kick', 'k123', 42);
        });

        it('returns error when count is missing', async () => {
            const modules = { httpServer: mockHttpServer } as any;
            registerRoutes(modules, logger);

            const route = routes.find(r => r.route === 'users/chat-messages/set');
            const handler = route?.handler;
            const req = { body: { platform: 'kick', userId: 'k123' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

            if (handler) {
                await handler(req, res);
            }

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('POST /users/chat-messages/increment', () => {
        it('increments chat messages and returns new value', async () => {
            const modules = { httpServer: mockHttpServer } as any;
            registerRoutes(modules, logger);

            const route = routes.find(r => r.route === 'users/chat-messages/increment');
            const handler = route?.handler;
            const incrementChatMessagesMock = platformLib.userDatabase.incrementChatMessages as jest.Mock;
            incrementChatMessagesMock.mockResolvedValue(15);

            const req = {
                body: {
                    platform: 'youtube',
                    userId: 'yUC123',
                    amount: 5
                }
            };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

            if (handler) {
                await handler(req, res);
            }

            expect(res.json).toHaveBeenCalledWith({ success: true, newValue: 15 });
            expect(incrementChatMessagesMock).toHaveBeenCalledWith('youtube', 'yUC123', 5);
        });

        it('returns error when amount is undefined', async () => {
            const modules = { httpServer: mockHttpServer } as any;
            registerRoutes(modules, logger);

            const route = routes.find(r => r.route === 'users/chat-messages/increment');
            const handler = route?.handler;
            const req = { body: { platform: 'kick', userId: 'k123' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

            if (handler) {
                await handler(req, res);
            }

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('POST /users/minutes-in-channel/set', () => {
        it('sets minutes in channel successfully', async () => {
            const modules = { httpServer: mockHttpServer } as any;
            registerRoutes(modules, logger);

            const route = routes.find(r => r.route === 'users/minutes-in-channel/set');
            const handler = route?.handler;
            const setMinutesInChannelMock = platformLib.userDatabase.setMinutesInChannel as jest.Mock;
            setMinutesInChannelMock.mockResolvedValue(undefined);

            const req = {
                body: {
                    platform: 'kick',
                    userId: 'k123',
                    minutes: 120
                }
            };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

            if (handler) {
                await handler(req, res);
            }

            expect(res.json).toHaveBeenCalledWith({ success: true });
            expect(setMinutesInChannelMock).toHaveBeenCalledWith('kick', 'k123', 120);
        });

        it('returns error when minutes is missing', async () => {
            const modules = { httpServer: mockHttpServer } as any;
            registerRoutes(modules, logger);

            const route = routes.find(r => r.route === 'users/minutes-in-channel/set');
            const handler = route?.handler;
            const req = { body: { platform: 'kick', userId: 'k123' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

            if (handler) {
                await handler(req, res);
            }

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('POST /users/minutes-in-channel/increment', () => {
        it('increments minutes in channel and returns new value', async () => {
            const modules = { httpServer: mockHttpServer } as any;
            registerRoutes(modules, logger);

            const route = routes.find(r => r.route === 'users/minutes-in-channel/increment');
            const handler = route?.handler;
            const incrementMinutesInChannelMock = platformLib.userDatabase.incrementMinutesInChannel as jest.Mock;
            incrementMinutesInChannelMock.mockResolvedValue(75);

            const req = {
                body: {
                    platform: 'kick',
                    userId: 'k123',
                    amount: 15
                }
            };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

            if (handler) {
                await handler(req, res);
            }

            expect(res.json).toHaveBeenCalledWith({ success: true, newValue: 75 });
            expect(incrementMinutesInChannelMock).toHaveBeenCalledWith('kick', 'k123', 15);
        });

        it('returns error when amount is undefined', async () => {
            const modules = { httpServer: mockHttpServer } as any;
            registerRoutes(modules, logger);

            const route = routes.find(r => r.route === 'users/minutes-in-channel/increment');
            const handler = route?.handler;
            const req = { body: { platform: 'kick', userId: 'k123' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

            if (handler) {
                await handler(req, res);
            }

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });
});
