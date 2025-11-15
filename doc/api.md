# Platform Library API Reference

Complete reference for the Platform Library IPC protocol and TypeScript interfaces.

## Version

**Current Version:** 1.0.0  
**Protocol Version:** 1.0.0

## Table of Contents

- [IPC Events](#ipc-events)
  - [Verification Events](#verification-events)
  - [Registration Events](#registration-events)
  - [Platform Query Events](#platform-query-events)
  - [Dispatch Events](#dispatch-events)
- [Operation Contracts](#operation-contracts)
  - [Chat Operations](#chat-operations)
  - [User Operations](#user-operations)
  - [Moderation Operations](#moderation-operations)
  - [Stream Management Operations](#stream-management-operations)
- [Type Definitions](#type-definitions)
- [Error Handling](#error-handling)
- [Version Compatibility](#version-compatibility)

## IPC Events

All IPC communication uses Firebot's `frontendCommunicator` (for frontend-to-backend) or `backendCommunicator` (for backend-to-frontend) event system.

### Verification Events

#### `platform-lib:ping`

Verify the Platform Library is loaded and get version information.

**Direction:** Frontend → Backend  
**Request:** `null`  
**Response:** `PlatformLibVersionInfo`

```typescript
interface PlatformLibVersionInfo {
    loaded: boolean;
    version: string;
}
```

**Example:**
```typescript
const versionInfo = await frontendCommunicator.fireEventAsync('platform-lib:ping', null);
console.log(`Platform Library v${versionInfo.version} is loaded`);
```

#### `platform-lib:get-version`

Get the Platform Library version string.

**Direction:** Frontend → Backend  
**Request:** `null`  
**Response:** `string`

**Example:**
```typescript
const version = await frontendCommunicator.fireEventAsync('platform-lib:get-version', null);
// Returns: "1.0.0"
```

### Registration Events

#### `platform-lib:register-integration`

Register a platform integration with the Platform Library.

**Direction:** Frontend → Backend  
**Request:** `RegistrationRequest`  
**Response:** `RegistrationResponse`

```typescript
interface RegistrationRequest {
    integration: IntegrationVersionInfo;
}

interface IntegrationVersionInfo {
    integrationId: string;           // Platform ID: 'kick', 'youtube', etc.
    integrationName: string;          // Script name: 'mage-kick-integration'
    platformLibVersion: string;       // Semver range: '^1.0.0'
    supportedOperations: string[];    // List of operation names
}

interface RegistrationResponse {
    success: boolean;
    error?: string;
}
```

**Example:**
```typescript
const response = await frontendCommunicator.fireEventAsync(
    'platform-lib:register-integration',
    {
        integration: {
            integrationId: 'kick',
            integrationName: 'mage-kick-integration',
            platformLibVersion: '^1.0.0',
            supportedOperations: [
                'send-chat-message',
                'get-user-display-name'
            ]
        }
    }
);

if (!response.success) {
    console.error(`Registration failed: ${response.error}`);
}
```

#### `platform-lib:deregister-integration`

Deregister a platform integration (called on shutdown).

**Direction:** Frontend → Backend  
**Request:** `DeregistrationRequest`  
**Response:** `DeregistrationResponse`

```typescript
interface DeregistrationRequest {
    integrationId: string;
}

interface DeregistrationResponse {
    success: boolean;
    error?: string;
}
```

**Example:**
```typescript
await frontendCommunicator.fireEventAsync(
    'platform-lib:deregister-integration',
    { integrationId: 'kick' }
);
```

### Platform Query Events

#### `platform-lib:get-available-platforms`

Query which platforms are currently available (registered and ready).

**Direction:** Frontend → Backend  
**Request:** `null`  
**Response:** `QueryPlatformsResponse`

```typescript
interface QueryPlatformsResponse {
    platforms: string[];  // Array of platform IDs
}
```

**Example:**
```typescript
const result = await frontendCommunicator.fireEventAsync(
    'platform-lib:get-available-platforms',
    null
);
// result.platforms = ['twitch', 'kick']
```

### Dispatch Events

#### `platform-lib:dispatch`

Dispatch an operation to a specific platform integration.

**Direction:** Frontend → Backend  
**Request:** `DispatchRequest`  
**Response:** Varies by operation

```typescript
interface DispatchRequest {
    platform: string;      // Target platform: 'kick', 'youtube', 'twitch'
    operation: string;     // Operation name: 'send-chat-message', etc.
    data: unknown;         // Operation-specific data
}
```

**Example:**
```typescript
const response = await frontendCommunicator.fireEventAsync(
    'platform-lib:dispatch',
    {
        platform: 'kick',
        operation: 'send-chat-message',
        data: {
            message: 'Hello from Platform Library!',
            replyId: null
        }
    }
);
```

## Operation Contracts

Platform integrations implement handlers for these operations. The Platform Library routes dispatch calls to the appropriate integration.

### Chat Operations

#### `send-chat-message`

Send a chat message to the platform.

**Handler Event:** `{integrationName}:send-chat-message`  
**Request:** `SendChatMessageRequest`  
**Response:** `SendChatMessageResponse`

```typescript
interface SendChatMessageRequest {
    message: string;
    replyId?: string | null;  // Optional: message ID to reply to
}

interface SendChatMessageResponse {
    success: boolean;
    error?: string;
}
```

**Example Implementation:**
```typescript
backendCommunicator.on(
    'mage-kick-integration:send-chat-message',
    async (request: SendChatMessageRequest) => {
        try {
            await chatManager.sendMessage(request.message, request.replyId);
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
);
```

### User Operations

#### `get-user-display-name`

Get a user's display name from the platform.

**Handler Event:** `{integrationName}:get-user-display-name`  
**Request:** `GetUserDisplayNameRequest`  
**Response:** `GetUserDisplayNameResponse`

```typescript
interface GetUserDisplayNameRequest {
    username: string;  // Username to query
}

interface GetUserDisplayNameResponse {
    displayName: string | null;  // Display name or null if not found
}
```

**Example Implementation:**
```typescript
backendCommunicator.on(
    'mage-kick-integration:get-user-display-name',
    async (request: GetUserDisplayNameRequest) => {
        const user = await userManager.getUser(request.username);
        return {
            displayName: user?.displayName || null
        };
    }
);
```

### Moderation Operations

#### `ban-user`

Permanently ban a user from the platform.

**Handler Event:** `{integrationName}:ban-user`  
**Request:** `BanUserRequest`  
**Response:** `ModerationResponse`

```typescript
interface BanUserRequest {
    username: string;
}

interface ModerationResponse {
    success: boolean;
    error?: string;
}
```

#### `timeout-user`

Temporarily ban (timeout) a user from the platform.

**Handler Event:** `{integrationName}:timeout-user`  
**Request:** `TimeoutUserRequest`  
**Response:** `ModerationResponse`

```typescript
interface TimeoutUserRequest {
    username: string;
    durationMinutes: number;
}
```

**Example Implementation:**
```typescript
backendCommunicator.on(
    'mage-kick-integration:timeout-user',
    async (request: TimeoutUserRequest) => {
        try {
            await moderationApi.timeout(
                request.username,
                request.durationMinutes
            );
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
);
```

### Stream Management Operations

#### `set-stream-title`

Update the stream title.

**Handler Event:** `{integrationName}:set-stream-title`  
**Request:** `SetStreamTitleRequest`  
**Response:** `StreamManagementResponse`

```typescript
interface SetStreamTitleRequest {
    title: string;
}

interface StreamManagementResponse {
    success: boolean;
    error?: string;
}
```

#### `set-stream-category`

Update the stream category/game.

**Handler Event:** `{integrationName}:set-stream-category`  
**Request:** `SetStreamCategoryRequest`  
**Response:** `StreamManagementResponse`

```typescript
interface SetStreamCategoryRequest {
    categoryId: string;  // Platform-specific category/game ID
}
```

**Example Implementation:**
```typescript
backendCommunicator.on(
    'mage-kick-integration:set-stream-title',
    async (request: SetStreamTitleRequest) => {
        try {
            await streamApi.setTitle(request.title);
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
);
```

## Type Definitions

### Platform Detection

The Platform Library detects platforms using this hierarchy:

1. **Explicit Platform Field**: `metadata.platform` or `metadata.eventData.platform`
2. **Event Source ID**: `metadata.eventSource.id`
3. **Username Suffix**: `username@kick`, `username@youtube`
4. **User ID Pattern**:
   - Kick: `k{numbers}` (e.g., `k12345678`)
   - YouTube: `y{alphanumeric}` (e.g., `y1234567890abcdefghijkl`)
5. **Event Data**: `metadata.eventData` with recognized platform patterns
6. **Fallback**: `unknown`

### Platform IDs

Standard platform identifier strings:

- `twitch` - Twitch platform
- `kick` - Kick platform
- `youtube` - YouTube platform
- `unknown` - Platform could not be determined

### Username Formats

- **Twitch**: Plain username (e.g., `username`)
- **Kick**: Username with suffix (e.g., `username@kick`)
- **YouTube**: Username with suffix (e.g., `username@youtube`)

### User ID Patterns

- **Twitch**: Numeric string (e.g., `"12345678"`)
- **Kick**: `k` prefix + numeric (e.g., `"k12345678"`)
- **YouTube**: `y` prefix + alphanumeric (e.g., `"y1234567890abcdefghijkl"`)

## Error Handling

### Error Response Format

All operations return errors in a consistent format:

```typescript
interface ErrorResponse {
    success: false;
    error: string;  // Human-readable error message
}
```

### Common Error Scenarios

1. **Integration Not Installed**
   ```typescript
   {
       success: false,
       error: "Integration for platform \"kick\" is not installed"
   }
   ```

2. **Version Incompatibility**
   ```typescript
   {
       success: false,
       error: "Integration version 0.5.0 does not satisfy requirement ^0.6.0"
   }
   ```

3. **Operation Not Supported**
   ```typescript
   {
       success: false,
       error: "Operation \"ban-user\" not supported by integration"
   }
   ```

4. **Platform Operation Failure**
   ```typescript
   {
       success: false,
       error: "Failed to send chat message: Network error"
   }
   ```

### Error Handling Best Practices

1. **Always Check Success**: Never assume operations succeed
2. **Log Errors**: Use appropriate log level (error, warn, debug)
3. **Provide Context**: Include relevant details in error messages
4. **Graceful Degradation**: Have fallbacks for failed operations
5. **User Feedback**: Show user-friendly error messages when appropriate

## Version Compatibility

### Semantic Versioning

Platform Library follows semantic versioning (MAJOR.MINOR.PATCH):

- **MAJOR**: Breaking changes to IPC protocol (integrations must update)
- **MINOR**: New features, backward compatible (integrations should work)
- **PATCH**: Bug fixes, backward compatible (integrations should work)

### Version Checking

Use the provided compatibility checker:

```typescript
import { checkVersionCompatibility } from '@mage-platform-lib/client';

const result = checkVersionCompatibility('^1.0.0', '1.2.0');
// result.compatible = true

const result2 = checkVersionCompatibility('^1.0.0', '0.9.0');
// result2.compatible = false
// result2.reason = "Version 0.9.0 does not satisfy requirement ^1.0.0"
```

### Breaking Changes

When the MAJOR version changes, expect:

- IPC event names may change
- Request/response interfaces may change
- Required operations may be added or removed
- Platform detection logic may change

### Deprecation Policy

- Deprecated features will be marked in documentation
- Deprecated features will remain functional for at least one MAJOR version
- Warnings will be logged when deprecated features are used
- Migration guides will be provided for breaking changes

## TypeScript Package

Install type definitions for TypeScript projects:

```bash
npm install @mage-platform-lib/client
```

Import types:

```typescript
import {
    SendChatMessageRequest,
    SendChatMessageResponse,
    RegistrationRequest,
    checkVersionCompatibility,
    PLATFORM_LIB_VERSION
} from '@mage-platform-lib/client';
```

## Additional Resources

- [Integration Developer Guide](integration-guide.md) - Implementation examples
- [User Guide](user-guide.md) - How to use platform features
- [GitHub Repository](https://github.com/TheStaticMage/firebot-mage-platform-lib) - Source code and issues
