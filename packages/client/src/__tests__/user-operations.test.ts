/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
    getOrCreateUser,
    getUserById,
    getUserByUsername,
    incrementChatMessages,
    incrementMinutesInChannel,
    incrementUserMetadata,
    setChatMessages,
    setMinutesInChannel,
    setUserMetadata,
    updateLastSeen
} from '../user-operations';

type FetchResponse = {
    ok: boolean;
    status: number;
    statusText: string;
    text: jest.Mock<Promise<string>>;
};

function createResponse(payload: unknown, ok = true, status = 200, statusText = 'OK'): FetchResponse {
    return {
        ok,
        status,
        statusText,
        text: jest.fn().mockResolvedValue(payload ? JSON.stringify(payload) : '')
    };
}

describe('user-operations', () => {
    const fetchMock = jest.fn();

    beforeEach(() => {
        fetchMock.mockReset();
        (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;
    });

    it('calls getUserById with query parameters', async () => {
        const responsePayload = { success: true, user: { _id: 'k123' } };
        fetchMock.mockResolvedValue(createResponse(responsePayload));

        const result = await getUserById({ platform: 'kick', userId: 'k123' });

        const expectedUrl = new URL('http://localhost:7472/integrations/mage-platform-lib/users/by-id');
        expectedUrl.searchParams.set('platform', 'kick');
        expectedUrl.searchParams.set('userId', 'k123');

        expect(fetchMock).toHaveBeenCalledWith(
            expectedUrl.toString(),
            expect.objectContaining({ method: 'GET' })
        );
        expect(result).toEqual(responsePayload);
    });

    it('calls getUserByUsername without platform when omitted', async () => {
        const responsePayload = { success: true, user: undefined };
        fetchMock.mockResolvedValue(createResponse(responsePayload));

        const result = await getUserByUsername({ username: 'user' });

        const expectedUrl = new URL('http://localhost:7472/integrations/mage-platform-lib/users/by-username');
        expectedUrl.searchParams.set('username', 'user');

        expect(fetchMock).toHaveBeenCalledWith(
            expectedUrl.toString(),
            expect.objectContaining({ method: 'GET' })
        );
        expect(result).toEqual(responsePayload);
    });

    it('calls getOrCreateUser with POST body', async () => {
        const responsePayload = { success: true, user: { _id: 'k123' }, created: true };
        fetchMock.mockResolvedValue(createResponse(responsePayload));

        const result = await getOrCreateUser({
            platform: 'kick',
            userId: 'k123',
            username: 'user'
        });

        expect(fetchMock).toHaveBeenCalledWith(
            'http://localhost:7472/integrations/mage-platform-lib/users/get-or-create',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ platform: 'kick', userId: 'k123', username: 'user' })
            })
        );
        expect(result).toEqual(responsePayload);
    });

    it('returns error response when server fails', async () => {
        fetchMock.mockResolvedValue(createResponse({ error: 'bad request' }, false, 400, 'Bad Request'));

        const result = await updateLastSeen({ platform: 'kick', userId: 'k123' });

        expect(result).toEqual({ success: false, error: 'bad request' });
    });

    it('calls metadata and activity endpoints with POST bodies', async () => {
        fetchMock.mockResolvedValue(createResponse({ success: true }));

        await setUserMetadata({ platform: 'kick', userId: 'k123', key: 'test', value: 1 });
        await incrementUserMetadata({ platform: 'kick', userId: 'k123', key: 'test', amount: 2 });
        await updateLastSeen({ platform: 'kick', userId: 'k123' });
        await setChatMessages({ platform: 'kick', userId: 'k123', count: 5 });
        await incrementChatMessages({ platform: 'kick', userId: 'k123', amount: 3 });
        await setMinutesInChannel({ platform: 'kick', userId: 'k123', minutes: 10 });
        await incrementMinutesInChannel({ platform: 'kick', userId: 'k123', amount: 4 });

        expect(fetchMock).toHaveBeenCalledWith(
            'http://localhost:7472/integrations/mage-platform-lib/users/metadata/set',
            expect.objectContaining({ method: 'POST' })
        );
        expect(fetchMock).toHaveBeenCalledWith(
            'http://localhost:7472/integrations/mage-platform-lib/users/metadata/increment',
            expect.objectContaining({ method: 'POST' })
        );
        expect(fetchMock).toHaveBeenCalledWith(
            'http://localhost:7472/integrations/mage-platform-lib/users/update-last-seen',
            expect.objectContaining({ method: 'POST' })
        );
        expect(fetchMock).toHaveBeenCalledWith(
            'http://localhost:7472/integrations/mage-platform-lib/users/chat-messages/set',
            expect.objectContaining({ method: 'POST' })
        );
        expect(fetchMock).toHaveBeenCalledWith(
            'http://localhost:7472/integrations/mage-platform-lib/users/chat-messages/increment',
            expect.objectContaining({ method: 'POST' })
        );
        expect(fetchMock).toHaveBeenCalledWith(
            'http://localhost:7472/integrations/mage-platform-lib/users/minutes-in-channel/set',
            expect.objectContaining({ method: 'POST' })
        );
        expect(fetchMock).toHaveBeenCalledWith(
            'http://localhost:7472/integrations/mage-platform-lib/users/minutes-in-channel/increment',
            expect.objectContaining({ method: 'POST' })
        );
    });
});
