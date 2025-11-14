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
 * Moderation Operations
 */

export interface BanUserRequest {
    /**
     * Username to ban
     */
    username: string;

    /**
     * Optional reason for the ban
     */
    reason?: string;
}

export interface BanUserResponse {
    /**
     * Whether the ban was successful
     */
    success: boolean;

    /**
     * Error message if the operation failed
     */
    error?: string;
}

export interface TimeoutUserRequest {
    /**
     * Username to timeout
     */
    username: string;

    /**
     * Duration in minutes
     */
    durationMinutes: number;

    /**
     * Optional reason for the timeout
     */
    reason?: string;
}

export interface TimeoutUserResponse {
    /**
     * Whether the timeout was successful
     */
    success: boolean;

    /**
     * Error message if the operation failed
     */
    error?: string;
}

/**
 * Stream Management Operations
 */

export interface SetStreamTitleRequest {
    /**
     * The new stream title
     */
    title: string;
}

export interface SetStreamTitleResponse {
    /**
     * Whether the title was set successfully
     */
    success: boolean;

    /**
     * Error message if the operation failed
     */
    error?: string;
}

export interface SetStreamCategoryRequest {
    /**
     * The new category/game name
     */
    category: string;
}

export interface SetStreamCategoryResponse {
    /**
     * Whether the category was set successfully
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
export type OperationName =
    | "send-chat-message"
    | "get-user-display-name"
    | "ban-user"
    | "timeout-user"
    | "set-stream-title"
    | "set-stream-category";
