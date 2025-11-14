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

## License

GPL-3.0
