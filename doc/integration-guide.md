# Integration Developer Guide

This guide is for developers creating platform integrations (like Kick or YouTube) that work with the Platform Library.

## Overview

The Platform Library provides a standardized way for platform integrations to:

- Receive platform-specific operations (send chat, get user info, etc.)
- Integrate seamlessly with platform-aware effects and variables

## Prerequisites

- Firebot v5 or later
- Platform Library v1.0.0 or later installed
- Basic understanding of Firebot custom scripts and integrations

## Check for Platform Library

Verify the Platform Library is installed and compatible:

```typescript
import { checkVersionCompatibility } from '@mage-platform-lib/client';

async function checkPlatformLib(frontendCommunicator: any, logger: any): Promise<boolean> {
    try {
        // Ping the library to verify it's loaded
        const versionInfo = await frontendCommunicator.fireEventAsync('platform-lib:ping', null);

        if (!versionInfo || !versionInfo.version) {
            logger.error('Platform Library is not installed');
            return false;
        }

        logger.info(`Platform Library detected: v${versionInfo.version}`);

        // Check version compatibility
        const requiredVersion = '^1.0.0'; // Your integration's requirement
        const compatible = checkVersionCompatibility(requiredVersion, versionInfo.version);

        if (!compatible.compatible) {
            logger.error(`Platform Library version incompatible: ${compatible.reason}`);
            return false;
        }

        return true;
    } catch (error) {
        logger.error(`Failed to detect Platform Library: ${error}`);
        return false;
    }
}
```

## Implementing Operation Handlers

Your integration must implement IPC handlers for each supported operation.

### Send Chat Message

```typescript
import { SendChatMessageRequest, SendChatMessageResponse } from '@mage-platform-lib/client';

function registerSendChatHandler(
    backendCommunicator: any,
    chatManager: any,
    logger: any
): void {
    backendCommunicator.on(
        'mage-kick-integration:send-chat-message', // Format: {integrationName}:{operation}
        async (request: SendChatMessageRequest): Promise<SendChatMessageResponse> => {
            try {
                logger.debug(`Sending chat message: ${request.message}`);

                await chatManager.sendKickChatMessage(
                    request.message,
                    request.replyId // Optional: for replying to messages
                );

                return {
                    success: true
                };
            } catch (error) {
                logger.error(`Failed to send chat message: ${error}`);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                };
            }
        }
    );
}
```

### Get User Display Name

```typescript
import { GetUserDisplayNameRequest, GetUserDisplayNameResponse } from '@mage-platform-lib/client';

function registerGetUserDisplayNameHandler(
    backendCommunicator: any,
    userManager: any,
    logger: any
): void {
    backendCommunicator.on(
        'mage-kick-integration:get-user-display-name',
        async (request: GetUserDisplayNameRequest): Promise<GetUserDisplayNameResponse> => {
            try {
                // Remove platform suffix if present (e.g., "username@kick" -> "username")
                const cleanUsername = request.username.replace(/@kick$/, '');

                const user = await userManager.getViewerByUsername(cleanUsername);

                return {
                    displayName: user?.displayName || null
                };
            } catch (error) {
                logger.error(`Failed to get user display name: ${error}`);
                return {
                    displayName: null
                };
            }
        }
    );
}
```

## Complete Integration Example

Here's a complete example of integration initialization:

```typescript
import { IntegrationDefinition } from '@crowbartools/firebot-custom-scripts-types';
import {
    checkVersionCompatibility,
    RegistrationRequest,
    DeregistrationRequest
} from '@mage-platform-lib/client';

export class MyPlatformIntegration {
    async init(modules: any): Promise<void> {
        const { frontendCommunicator, logger } = modules;

        // Step 1: Check Platform Library
        const platformLibAvailable = await this.checkPlatformLib(
            frontendCommunicator,
            logger
        );

        if (!platformLibAvailable) {
            throw new Error('Platform Library is required but not found');
        }

        // Step 2: Register handlers
        this.registerOperationHandlers(modules);

        // Step 3: Register with Platform Library
        await this.registerWithPlatformLib(frontendCommunicator, logger);

        logger.info('Integration initialized successfully');
    }

    async disconnect(modules: any): Promise<void> {
        const { frontendCommunicator, logger } = modules;
        await this.deregisterFromPlatformLib(frontendCommunicator, logger);
    }

    private registerOperationHandlers(modules: any): void {
        const { backendCommunicator } = modules;

        // Register all your operation handlers here
        registerSendChatHandler(backendCommunicator, this.chatManager, modules.logger);
        registerGetUserDisplayNameHandler(backendCommunicator, this.userManager, modules.logger);
    }

    // ... checkPlatformLib, registerWithPlatformLib, deregisterFromPlatformLib methods
}
```

## Platform Naming Conventions

- **Integration ID**: Lowercase platform name (`kick`, `youtube`, `trovo`)
- **Integration Name**: Your package/script name (`mage-kick-integration`)
- **IPC Event Names**: `{integrationName}:{operation-name}`
- **Username Format**: Include platform suffix for disambiguation (`user@kick`, `user@youtube`)
- **User ID Format**:
  - Kick: `k{numeric-id}` (e.g., `k12345678`)
  - YouTube: `y{alphanumeric-id}` (e.g., `y1234567890abcdefghijkl`)

## Error Handling

All operation handlers should:

1. Catch all errors
2. Return `{ success: false, error: "message" }` on failure
3. Log errors with appropriate detail
4. Never throw unhandled exceptions

## Testing Your Integration

1. **Install Platform Library**: Ensure it's loaded as a startup script
2. **Enable Debug Mode**: Turn on debug logging in both the library and your integration
3. **Test Operations**: Create effects using platform-aware features
4. **Verify Dispatch**: Check logs for dispatch calls to your handlers

## Version Compatibility

Your integration should specify compatible Platform Library versions using semantic versioning:

- `^1.0.0` - Compatible with 1.x.x (recommended)
- `~1.0.0` - Compatible with 1.0.x only
- `1.0.0` - Exact version only (not recommended)

The Platform Library uses the following version policy:

- **Major version** changes break the IPC protocol (requires integration updates)
- **Minor version** adds new features (backward compatible)
- **Patch version** fixes bugs (backward compatible)

## Troubleshooting

### Integration Not Detected

- Verify Platform Library is installed and loaded
- Check that registration succeeded (look for success response)
- Ensure integration ID matches platform detector patterns

### Operations Not Working

- Verify handler IPC event names match expected format
- Check that operations are listed in `supportedOperations`
- Enable debug logging to see dispatch calls

### Version Mismatch

- Update integration to support newer Platform Library version
- Or downgrade Platform Library to compatible version
- Check compatibility with `checkVersionCompatibility()`

## Additional Resources

- [API Reference](api.md) - Complete interface documentation
- [User Guide](user-guide.md) - How users interact with platform features
- [Platform Library Types](https://github.com/TheStaticMage/firebot-mage-platform-lib/tree/main/packages/types) - TypeScript type definitions
