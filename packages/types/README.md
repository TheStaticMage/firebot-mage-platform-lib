# @mage-platform-lib/types

Shared TypeScript type definitions for the Mage Platform Library and platform integrations.

## Installation

```bash
npm install @mage-platform-lib/types
```

## Usage

```typescript
import {
    IntegrationVersionInfo,
    SendChatMessageRequest,
    SendChatMessageResponse
} from '@mage-platform-lib/types';

const versionInfo: IntegrationVersionInfo = {
    integrationId: "my-platform",
    integrationName: "my-integration",
    platformLibVersion: "^1.0.0",
    supportedOperations: ["send-chat-message"]
};
```

## Exported Types

### Version Types
- `PLATFORM_LIB_VERSION` - Current platform library version constant
- `PlatformLibVersionInfo` - Platform library version information
- `IntegrationVersionInfo` - Integration version and capability information

### Operation Types
- `PlatformOperation<TRequest, TResponse>` - Base operation interface
- `SendChatMessageRequest` / `SendChatMessageResponse`
- `GetUserDisplayNameRequest` / `GetUserDisplayNameResponse`
- `BanUserRequest` / `BanUserResponse`
- `TimeoutUserRequest` / `TimeoutUserResponse`
- `SetStreamTitleRequest` / `SetStreamTitleResponse`
- `SetStreamCategoryRequest` / `SetStreamCategoryResponse`
- `OperationName` - Type-safe operation names

### Registry Types
- `DetectedIntegration` - Detected integration information
- `RegistrationRequest` / `RegistrationResponse` - Integration registration
- `DeregistrationRequest` / `DeregistrationResponse` - Integration deregistration
- `QueryPlatformsResponse` - Available platforms query

### IPC Serialization
- `SerializedMessage<T>` - Wrapper for serialized messages with checksum
- `serialize<T>(payload)` - Serialize a payload to JSON string (strips undefined)
- `deserialize<T>(jsonString)` - Deserialize and validate from JSON string
- `isSerializedMessage(value)` - Type guard for serialized messages
- `SerializationError` - Thrown when serialization fails
- `DeserializationError` - Thrown when deserialization fails
- `ChecksumError` - Thrown when checksum verification fails

## IPC Serialization

All IPC messages should use the serialization utilities to ensure type safety and data integrity:

```typescript
import { serialize, deserialize } from '@mage-platform-lib/types';

// Sending a message
const messageString = serialize({ username: "user123", action: "ban" });
await frontendCommunicator.fireEventAsync("some-event", messageString);

// Receiving a message
frontendCommunicator.on("some-event", (messageString) => {
    try {
        const payload = deserialize(messageString);
        // payload is validated and safe to use
    } catch (error) {
        // Handle deserialization or checksum errors
    }
});
```

**Features:**
- Automatically strips `undefined` values to ensure JSON compatibility
- SHA-256 checksum for message integrity verification
- Timestamps for debugging and logging
- Version tracking for compatibility
- Type-safe serialization and deserialization

## License

GPL-3.0
