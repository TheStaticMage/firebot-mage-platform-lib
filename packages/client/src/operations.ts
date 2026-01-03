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
     * Optional send mode for stream-aware sending
     * Only applicable to integrations that support it
     */
    sendMode?: 'always' | 'when-connected' | 'when-live';

    /**
     * Optional flag to send to chat feed when message is not sent
     * Only applicable to integrations that support it
     */
    sendToChatFeed?: boolean;
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

export interface GetUserDisplayNameRequest {
    /**
     * Username to look up
     */
    username: string;
}

export interface GetUserDisplayNameResponse {
    /**
     * The user's display name, or null if not found
     */
    displayName: string | null;
}

/**
 * Operation type names (for type safety)
 */
export type OperationName =
    | "send-chat-message"
    | "get-user-display-name";
