/**
 * @mage-platform-lib/client
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

// Semantic version checking (commonly used for Firebot version validation)
export {
    checkSemanticVersion
} from './semantic-version';

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

// Script loading utilities
export {
    loadScriptVersion
} from './script-loader';

// Reflector utilities
export {
    ReflectorConfig,
    ReflectedEvent,
    createReflector,
    initializeReflector
} from './reflector-factory';

// Error modal utilities
export {
    ErrorModalConfig,
    createErrorModal,
    initializeErrorModal
} from './error-modal-factory';

// Startup scripts utilities
export {
    ScriptManifest,
    getStartupScripts,
    resetStartupScriptsReflector
} from './startup-scripts';

// Platform detection
export {
    detectPlatform
} from './platform-detector';
