# Integration Developer Guide

> **Note**: This guide is under active development. The Platform Library is currently being implemented according to the [multi-platform refactor plan](../plans/multi-platform-refactor.md).

## Overview

This guide is for developers building platform integrations (like Kick or YouTube) that need to communicate with the Platform Library.

## Integration Registration Protocol

### Registration Flow

When your integration initializes, it must register with the Platform Library:

1. Check if Platform Library is installed and loaded
2. Verify version compatibility
3. Register your integration with supported operations
4. Set up IPC handlers for platform operations

### Version Compatibility

Your integration should specify which Platform Library version it requires using semver notation (e.g., `^1.0.0`).

## IPC Events

### Registration Events

**`platform-lib:ping`** - Verify Platform Library is loaded
- Request: none
- Response: `{loaded: boolean, version: string}`

**`platform-lib:register-integration`** - Register your integration
- Request: `IntegrationVersionInfo` object
- Response: `{success: boolean, error?: string}`

**`platform-lib:deregister-integration`** - Unregister on shutdown
- Request: `{integrationId: string}`
- Response: `{success: boolean}`

### Platform Operations

Platform operations follow the naming pattern: `{integrationName}:{operation}`

Example: `mage-kick-integration:send-chat-message`

## Required Operation Handlers

Integrations should implement handlers for the following operations:

### Chat Operations

**`send-chat-message`**
- Request: `SendChatMessageRequest`
- Response: `SendChatMessageResponse`

**`get-user-display-name`**
- Request: `GetUserDisplayNameRequest`
- Response: `GetUserDisplayNameResponse`

### Moderation Operations

**`ban-user`**
- Request: `BanUserRequest`
- Response: `{success: boolean, error?: string}`

**`timeout-user`**
- Request: `TimeoutUserRequest`
- Response: `{success: boolean, error?: string}`

### Stream Management Operations

**`set-stream-title`**
- Request: `SetStreamTitleRequest`
- Response: `{success: boolean, error?: string}`

**`set-stream-category`**
- Request: `SetStreamCategoryRequest`
- Response: `{success: boolean, error?: string}`

## Type Definitions

Full type definitions will be available in the `@mage-platform-lib/types` npm package (coming soon).

## Example Implementation

```typescript
// Example structure - full implementation details coming soon

import { IntegrationVersionInfo } from '@mage-platform-lib/types';

const registrationInfo: IntegrationVersionInfo = {
    integrationId: "your-platform",
    integrationName: "your-integration-name",
    platformLibVersion: "^1.0.0",
    supportedOperations: [
        "send-chat-message",
        "get-user-display-name",
        // ... other operations
    ]
};

// Check Platform Library
const result = await frontendCommunicator.fireEventAsync("platform-lib:ping");

// Register
await frontendCommunicator.fireEventAsync(
    "platform-lib:register-integration",
    registrationInfo
);

// Implement handlers
frontendCommunicator.on("your-integration-name:send-chat-message", async (request) => {
    // Handle chat message sending
    return { success: true };
});
```

## Additional Resources

- [Multi-Platform Refactor Plan](../plans/multi-platform-refactor.md) - Detailed implementation plan
- [Platform Library README](../README.md) - User-facing documentation

## Status

This documentation will be completed as part of Phase 9 of the refactor plan. Check the [refactor plan](../plans/multi-platform-refactor.md) for current implementation status.
