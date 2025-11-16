/* eslint-disable @typescript-eslint/unbound-method */
import axios from 'axios';
import { HttpClient } from '../client';
import { LogWrapper } from '../../main';

jest.mock('axios');

describe('HttpClient', () => {
    let client: HttpClient;
    let mockLogger: LogWrapper;
    const mockAxios = axios as jest.Mocked<typeof axios>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        } as unknown as LogWrapper;

        mockAxios.create.mockReturnValue({
            get: jest.fn(),
            post: jest.fn()
        } as any);

        client = new HttpClient(mockLogger);
    });

    describe('GET requests', () => {
        it('should make a GET request with query parameters', async () => {
            const mockResponse = {
                data: { displayName: 'TestUser' },
                status: 200,
                statusText: 'OK'
            };

            const mockGet = jest.fn().mockResolvedValue(mockResponse);
            (mockAxios.create as jest.Mock).mockReturnValue({
                get: mockGet,
                post: jest.fn()
            } as any);

            client = new HttpClient(mockLogger);

            const result = await client.get('http://localhost:7472/test', {
                timeout: 3000,
                params: { username: 'testuser' }
            });

            expect(result.data).toEqual({ displayName: 'TestUser' });
            expect(result.status).toBe(200);
        });

        it('should use default timeout', async () => {
            const mockResponse = {
                data: { test: 'data' },
                status: 200,
                statusText: 'OK'
            };

            const mockGet = jest.fn().mockResolvedValue(mockResponse);
            (mockAxios.create as jest.Mock).mockReturnValue({
                get: mockGet,
                post: jest.fn()
            } as any);

            client = new HttpClient(mockLogger);

            await client.get('http://localhost:7472/test');

            expect(mockGet).toHaveBeenCalled();
            const callArgs = mockGet.mock.calls[0];
            expect(callArgs[1].timeout).toBe(30000);
        });
    });

    describe('POST requests', () => {
        it('should make a POST request with body', async () => {
            const mockResponse = {
                data: { success: true },
                status: 200,
                statusText: 'OK'
            };

            const mockPost = jest.fn().mockResolvedValue(mockResponse);
            (mockAxios.create as jest.Mock).mockReturnValue({
                get: jest.fn(),
                post: mockPost
            } as any);

            client = new HttpClient(mockLogger);

            const body = { message: 'Hello', chatter: 'Streamer' };
            const result = await client.post('http://localhost:7472/test', body, {
                timeout: 5000
            });

            expect(result.data).toEqual({ success: true });
            expect(mockPost).toHaveBeenCalledWith(
                'http://localhost:7472/test',
                body,
                expect.objectContaining({ timeout: 5000 })
            );
        });

        it('should use default timeout for POST', async () => {
            const mockResponse = {
                data: { success: true },
                status: 200,
                statusText: 'OK'
            };

            const mockPost = jest.fn().mockResolvedValue(mockResponse);
            (mockAxios.create as jest.Mock).mockReturnValue({
                get: jest.fn(),
                post: mockPost
            } as any);

            client = new HttpClient(mockLogger);

            await client.post('http://localhost:7472/test', {});

            expect(mockPost).toHaveBeenCalled();
            const callArgs = mockPost.mock.calls[0];
            expect(callArgs[2].timeout).toBe(30000);
        });
    });

    describe('Error handling', () => {
        it('should throw on network error without retries enabled', async () => {
            const mockGet = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
            (mockAxios.create as jest.Mock).mockReturnValue({
                get: mockGet,
                post: jest.fn()
            } as any);

            client = new HttpClient(mockLogger);

            await expect(
                client.get('http://localhost:7472/test', { retries: 0 })
            ).rejects.toThrow();
        });


        it('should log debug message on successful request', async () => {
            const mockGet = jest.fn().mockResolvedValue({
                data: { test: 'data' },
                status: 200,
                statusText: 'OK'
            });

            (mockAxios.create as jest.Mock).mockReturnValue({
                get: mockGet,
                post: jest.fn()
            } as any);

            client = new HttpClient(mockLogger);

            await client.get('http://localhost:7472/test');

            expect(mockLogger.debug).toHaveBeenCalledWith(
                expect.stringContaining('GET http://localhost:7472/test')
            );
        });

        it('should log error message on failure', async () => {
            const mockGet = jest.fn().mockRejectedValue(new Error('Test error'));
            (mockAxios.create as jest.Mock).mockReturnValue({
                get: mockGet,
                post: jest.fn()
            } as any);

            client = new HttpClient(mockLogger);

            await expect(
                client.get('http://localhost:7472/test', { retries: 0 })
            ).rejects.toThrow();

            expect(mockLogger.error).toHaveBeenCalled();
        });
    });
});
