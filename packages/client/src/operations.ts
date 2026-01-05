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
 * Operation type names (for type safety)
 */
export type OperationName = "send-chat-message";
