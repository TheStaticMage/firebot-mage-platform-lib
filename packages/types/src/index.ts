/**
 * @mage-platform-lib/types
 *
 * Shared TypeScript types for the Mage Platform Library and integrations
 */

// Version types
export {
    PLATFORM_LIB_VERSION,
    PlatformLibVersionInfo,
    IntegrationVersionInfo,
    SUPPORTED_OPERATIONS,
    createPlatformLibVersionInfo,
    createIntegrationVersionInfo
} from './version';

// Version compatibility
export {
    VersionCheckResult,
    PLATFORM_LIB_MIN_VERSION,
    checkVersionCompatibility
} from './version-compatibility';

// Operation types
export {
    PlatformOperation,
    SendChatMessageRequest,
    SendChatMessageResponse,
    GetUserDisplayNameRequest,
    GetUserDisplayNameResponse,
    OperationName
} from './operations';

// Registry types
export {
    DetectedIntegration,
    RegistrationRequest,
    RegistrationResponse,
    DeregistrationRequest,
    DeregistrationResponse,
    QueryPlatformsResponse
} from './registry';

// IPC Serialization
export {
    SerializedMessage,
    SerializationError,
    DeserializationError,
    ChecksumError,
    serialize,
    deserialize,
    isSerializedMessage
} from './ipc-serializer';
