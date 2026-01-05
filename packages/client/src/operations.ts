/**
 * Base interface for platform operations
 */
export interface PlatformOperation<TRequest, TResponse> {
    request: TRequest;
    response: TResponse;
}

/**
 * Chat Operations
 */

export interface SendChatMessageRequest {
    /**
     * The message to send
     */
    message: string;

    /**
     * Optional message ID to reply to
     */
    replyId?: string;

    /**
     * Optional chatter type (Streamer or Bot)
     */
    chatter?: 'Streamer' | 'Bot';

    /**
     * Optional mode for when the stream is offline
     */
    offlineSendMode?: 'send-anyway' | 'chat-feed-only' | 'do-not-send';
}

export interface SendChatMessageResponse {
    /**
     * Whether the message was sent successfully
     */
    success: boolean;

    /**
     * Error message if the operation failed
     */
    error?: string;
}

/**
 * Platform User type (subset of FirebotViewer)
 */
export interface PlatformUser {
    /**
     * Platform-prefixed user ID (k12345 for Kick, yUC123 for YouTube)
     */
    _id: string;

    /**
     * Normalized username (lowercase, no platform suffix)
     */
    username: string;

    /**
     * Display name for the user
     */
    displayName: string;

    /**
     * Profile picture URL
     */
    profilePicUrl: string;

    /**
     * Timestamp of last user activity
     */
    lastSeen: number;

    /**
     * Currency balances by currency ID
     */
    currency: Record<string, number>;

    /**
     * User metadata fields
     */
    metadata: Record<string, any>;

    /**
     * Chat message count
     */
    chatMessages: number;

    /**
     * Minutes spent in channel
     */
    minutesInChannel: number;

    /**
     * Viewer roles from the platform
     */
    twitchRoles: string[];
}

/**
 * User Operations
 */

export interface GetUserByIdRequest {
    platform: string;
    userId: string;
}

export interface GetUserByIdResponse {
    success: boolean;
    user?: PlatformUser;
    error?: string;
}

export interface GetUserByUsernameRequest {
    username: string;
    platform?: string;
}

export interface GetUserByUsernameResponse {
    success: boolean;
    user?: PlatformUser;
    error?: string;
}

export interface GetOrCreateUserRequest {
    platform: string;
    userId: string;
    username: string;
    displayName?: string;
    profilePicUrl?: string;
}

export interface GetOrCreateUserResponse {
    success: boolean;
    user?: PlatformUser;
    created?: boolean;
    error?: string;
}

export interface SetUserMetadataRequest {
    platform: string;
    userId: string;
    key: string;
    value: any;
}

export interface SetUserMetadataResponse {
    success: boolean;
    error?: string;
}

export interface IncrementUserMetadataRequest {
    platform: string;
    userId: string;
    key: string;
    amount: number;
}

export interface IncrementUserMetadataResponse {
    success: boolean;
    newValue?: number;
    error?: string;
}

export interface SetUserRolesRequest {
    platform: string;
    userId: string;
    roles: string[];
}

export interface SetUserRolesResponse {
    success: boolean;
    error?: string;
}

export interface UpdateLastSeenRequest {
    platform: string;
    userId: string;
}

export interface UpdateLastSeenResponse {
    success: boolean;
    error?: string;
}

export interface SetChatMessagesRequest {
    platform: string;
    userId: string;
    count: number;
}

export interface SetChatMessagesResponse {
    success: boolean;
    error?: string;
}

export interface IncrementChatMessagesRequest {
    platform: string;
    userId: string;
    amount: number;
}

export interface IncrementChatMessagesResponse {
    success: boolean;
    newValue?: number;
    error?: string;
}

export interface SetMinutesInChannelRequest {
    platform: string;
    userId: string;
    minutes: number;
}

export interface SetMinutesInChannelResponse {
    success: boolean;
    error?: string;
}

export interface IncrementMinutesInChannelRequest {
    platform: string;
    userId: string;
    amount: number;
}

export interface IncrementMinutesInChannelResponse {
    success: boolean;
    newValue?: number;
    error?: string;
}

/**
 * Operation type names (for type safety)
 */
export type OperationName = "send-chat-message";
