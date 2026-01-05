import {
    DEFAULT_WEB_SERVER_PORT,
    INTEGRATIONS
} from './constants';
import type {
    GetUserByIdRequest,
    GetUserByIdResponse,
    GetUserByUsernameRequest,
    GetUserByUsernameResponse,
    GetOrCreateUserRequest,
    GetOrCreateUserResponse,
    IncrementChatMessagesRequest,
    IncrementChatMessagesResponse,
    IncrementMinutesInChannelRequest,
    IncrementMinutesInChannelResponse,
    IncrementUserMetadataRequest,
    IncrementUserMetadataResponse,
    SetChatMessagesRequest,
    SetChatMessagesResponse,
    SetMinutesInChannelRequest,
    SetMinutesInChannelResponse,
    SetUserMetadataRequest,
    SetUserMetadataResponse,
    SetUserRolesRequest,
    SetUserRolesResponse,
    UpdateLastSeenRequest,
    UpdateLastSeenResponse
} from './operations';

type ErrorResponse = { success: false; error: string };

type RequestOptions = {
    method: 'GET' | 'POST';
    body?: string;
    headers?: HeadersInit;
};

function buildErrorResponse(message: string): ErrorResponse {
    return { success: false, error: message };
}

async function requestJson<TResponse>(url: string, init: RequestOptions): Promise<TResponse> {
    try {
        const headers = new Headers(init.headers);
        headers.set('Content-Type', 'application/json');

        const response = await fetch(url, {
            method: init.method,
            body: init.body,
            headers
        });

        const text = await response.text();
        const data = text ? JSON.parse(text) : undefined;

        if (response.ok && data) {
            return data as TResponse;
        }

        const errorMessage = data?.error || `HTTP ${response.status}: ${response.statusText}`;
        return buildErrorResponse(errorMessage) as TResponse;
    } catch (error) {
        return buildErrorResponse(`Failed to reach platform library: ${error}`) as TResponse;
    }
}

function buildBaseUrl(port: number): string {
    return `http://localhost:${port}/integrations/${INTEGRATIONS.PLATFORM_LIB}`;
}

export async function getUserById(
    request: GetUserByIdRequest,
    port: number = DEFAULT_WEB_SERVER_PORT
): Promise<GetUserByIdResponse> {
    const url = new URL(`${buildBaseUrl(port)}/users/by-id`);
    url.searchParams.set('platform', request.platform);
    url.searchParams.set('userId', request.userId);

    return requestJson<GetUserByIdResponse>(url.toString(), { method: 'GET' });
}

export async function getUserByUsername(
    request: GetUserByUsernameRequest,
    port: number = DEFAULT_WEB_SERVER_PORT
): Promise<GetUserByUsernameResponse> {
    const url = new URL(`${buildBaseUrl(port)}/users/by-username`);
    url.searchParams.set('username', request.username);
    if (request.platform) {
        url.searchParams.set('platform', request.platform);
    }

    return requestJson<GetUserByUsernameResponse>(url.toString(), { method: 'GET' });
}

export async function getOrCreateUser(
    request: GetOrCreateUserRequest,
    port: number = DEFAULT_WEB_SERVER_PORT
): Promise<GetOrCreateUserResponse> {
    const url = `${buildBaseUrl(port)}/users/get-or-create`;
    return requestJson<GetOrCreateUserResponse>(url, {
        method: 'POST',
        body: JSON.stringify(request)
    });
}

export async function setUserMetadata(
    request: SetUserMetadataRequest,
    port: number = DEFAULT_WEB_SERVER_PORT
): Promise<SetUserMetadataResponse> {
    const url = `${buildBaseUrl(port)}/users/metadata/set`;
    return requestJson<SetUserMetadataResponse>(url, {
        method: 'POST',
        body: JSON.stringify(request)
    });
}

export async function incrementUserMetadata(
    request: IncrementUserMetadataRequest,
    port: number = DEFAULT_WEB_SERVER_PORT
): Promise<IncrementUserMetadataResponse> {
    const url = `${buildBaseUrl(port)}/users/metadata/increment`;
    return requestJson<IncrementUserMetadataResponse>(url, {
        method: 'POST',
        body: JSON.stringify(request)
    });
}

export async function setUserRoles(
    request: SetUserRolesRequest,
    port: number = DEFAULT_WEB_SERVER_PORT
): Promise<SetUserRolesResponse> {
    const url = `${buildBaseUrl(port)}/users/roles/set`;
    return requestJson<SetUserRolesResponse>(url, {
        method: 'POST',
        body: JSON.stringify(request)
    });
}

export async function updateLastSeen(
    request: UpdateLastSeenRequest,
    port: number = DEFAULT_WEB_SERVER_PORT
): Promise<UpdateLastSeenResponse> {
    const url = `${buildBaseUrl(port)}/users/update-last-seen`;
    return requestJson<UpdateLastSeenResponse>(url, {
        method: 'POST',
        body: JSON.stringify(request)
    });
}

export async function setChatMessages(
    request: SetChatMessagesRequest,
    port: number = DEFAULT_WEB_SERVER_PORT
): Promise<SetChatMessagesResponse> {
    const url = `${buildBaseUrl(port)}/users/chat-messages/set`;
    return requestJson<SetChatMessagesResponse>(url, {
        method: 'POST',
        body: JSON.stringify(request)
    });
}

export async function incrementChatMessages(
    request: IncrementChatMessagesRequest,
    port: number = DEFAULT_WEB_SERVER_PORT
): Promise<IncrementChatMessagesResponse> {
    const url = `${buildBaseUrl(port)}/users/chat-messages/increment`;
    return requestJson<IncrementChatMessagesResponse>(url, {
        method: 'POST',
        body: JSON.stringify(request)
    });
}

export async function setMinutesInChannel(
    request: SetMinutesInChannelRequest,
    port: number = DEFAULT_WEB_SERVER_PORT
): Promise<SetMinutesInChannelResponse> {
    const url = `${buildBaseUrl(port)}/users/minutes-in-channel/set`;
    return requestJson<SetMinutesInChannelResponse>(url, {
        method: 'POST',
        body: JSON.stringify(request)
    });
}

export async function incrementMinutesInChannel(
    request: IncrementMinutesInChannelRequest,
    port: number = DEFAULT_WEB_SERVER_PORT
): Promise<IncrementMinutesInChannelResponse> {
    const url = `${buildBaseUrl(port)}/users/minutes-in-channel/increment`;
    return requestJson<IncrementMinutesInChannelResponse>(url, {
        method: 'POST',
        body: JSON.stringify(request)
    });
}
